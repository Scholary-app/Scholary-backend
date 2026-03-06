import express from 'express';
import authRoutes from './auth.routes.js';

const router = express.Router();

// Rutas de autenticación
router.use('/auth', authRoutes);

export default router;
