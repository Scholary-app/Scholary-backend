import express from 'express';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Iniciar autenticación con Google
router.get('/google', (req, res, next) => {
  // Capturamos si viene de móvil para pasarlo en el parámetro 'state'
  const isMobile = req.query.mobile === 'true';
  const state = isMobile ? 'mobile' : 'web';
  
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    state: state // Google nos devolverá este mismo valor en el callback
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
      
      // Detectar si es móvil leyendo el parámetro 'state' que Google nos devuelve
      const state = req.query.state;
      const isMobile = state === 'mobile';
      
      if (isMobile) {
        // Redirección para App Móvil (Deep Link)
        res.redirect(`scholary://auth-callback?token=${token}`);
      } else {
        // Redirección para Frontend Web
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