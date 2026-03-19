import express from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import classRoutes from './class.routes.js';
import studentRoutes from './student.routes.js';


const router = express.Router();

// Rutas de autenticación
router.use('/auth', authRoutes);
// Rutas de usuarios
router.use('/users', userRoutes);
// Rutas de clases
router.use('/classes', classRoutes);
// Rutas de estudiantes
router.use('/students', studentRoutes);

export default router;
