import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './prisma.js'; // Recuerda siempre el .js al final

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // 1. Buscar si el usuario ya existe por email
      let user = await prisma.user.findUnique({
        where: { email: profile.emails[0].value }
      });
      
      // 2. Si no existe, lo creamos
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: profile.emails[0].value,
            fullName: profile.displayName,
            avatarUrl: profile.photos[0]?.value,
            passwordHash: 'GOOGLE_OAUTH', // No usa password local
          }
        });
      }
      
      // 3. Actualizamos su último login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

// Serialización de la sesión
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;