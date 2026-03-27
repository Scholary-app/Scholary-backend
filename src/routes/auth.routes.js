import express from 'express';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

function parseOAuthState(rawState) {
  try {
    if (!rawState || typeof rawState !== 'string') {
      return { client: 'web', redirectUri: '' };
    }

    const decoded = Buffer.from(rawState, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded);

    return {
      client: parsed.client === 'mobile' ? 'mobile' : 'web',
      redirectUri: typeof parsed.redirectUri === 'string' ? parsed.redirectUri : '',
    };
  } catch {
    return { client: rawState === 'mobile' ? 'mobile' : 'web', redirectUri: '' };
  }
}

// Iniciar autenticación con Google
router.get('/google', (req, res, next) => {
  const isMobile = req.query.mobile === 'true';
  const statePayload = {
    client: isMobile ? 'mobile' : 'web',
    redirectUri: isMobile && typeof req.query.redirect_uri === 'string' ? req.query.redirect_uri : '',
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');
  
  passport.authenticate('google', { 
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/classroom.courses.readonly',
      'https://www.googleapis.com/auth/classroom.rosters.readonly',
      'https://www.googleapis.com/auth/classroom.profile.emails',
      'https://www.googleapis.com/auth/classroom.profile.photos',
    ],
    state,
    accessType: 'offline',
    prompt: 'consent',
  })(req, res, next);
});

// Callback de Google
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false 
  }),
  async (req, res, next) => {
    try {
      // Generar JWT
      const token = jwt.sign(
        { userId: req.user.id, email: req.user.email },
        process.env.JWT_SECRET || 'mi_secreto_super_seguro_scholary_2026',
        { expiresIn: '7d' }
      );
      
      const state = parseOAuthState(req.query.state);
      const isMobile = state.client === 'mobile';
      
      if (isMobile) {
        const redirectBase = state.redirectUri || 'scholary://auth-callback';
        const separator = redirectBase.includes('?') ? '&' : '?';
        res.redirect(`${redirectBase}${separator}token=${encodeURIComponent(token)}`);
      } else {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8081';
        res.redirect(`${frontendUrl}/auth-success?token=${token}`);
      }
    } catch (error) {
      next(error);
    }
  }
);

// Obtener perfil del usuario actual
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        lateToleranceMinutes: true,
        applyThreeStrikesRule: true,
      }
    });
    
    if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

// 4. Logout
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logout exitoso' });
});

export default router;