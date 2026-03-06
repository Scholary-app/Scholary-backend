import express from 'express';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

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

export default router;