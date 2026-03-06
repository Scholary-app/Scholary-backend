import express from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';

const router = express.Router();

// Rutas de autenticación
router.use('/auth', authRoutes);
// Rutas de usuarios
router.use('/users', userRoutes);

export default router;
