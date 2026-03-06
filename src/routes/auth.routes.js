import express from 'express';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// 1. Iniciar autenticación con Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// 2. Callback de Google (a donde regresa después de aceptar)
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false // Usaremos JWT en lugar de sesiones de Express para el frontend
  }),
  (req, res) => {
    // Generar JWT
    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email },
      process.env.JWT_SECRET || 'mi_secreto_super_seguro_scholary_2026', // Pon JWT_SECRET en tu .env
      { expiresIn: '7d' } // Expira en 7 días
    );
    
    // Redirigir al frontend con el token en la URL (ajusta el puerto de tu frontend si es diferente)
    res.redirect(`http://localhost:8081/auth-success?token=${token}`);
  }
);

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
    next(error); // Si hay un error, lo mandamos a nuestro errorHandler
  }
});

// 3. Ruta de Logout
router.post('/logout', (req, res) => {
  // borrando el token guardado. Aquí solo respondemos con éxito.
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
});

export default router;