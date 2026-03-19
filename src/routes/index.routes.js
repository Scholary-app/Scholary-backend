import express from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import classRoutes from './class.routes.js';
import studentRoutes from './student.routes.js';
import scheduleRoutes from './schedule.routes.js';
import sessionRoutes from './attendance-session.routes.js';
import recordRoutes from './attendance-record.routes.js';


const router = express.Router();

// Rutas de autenticación
router.use('/auth', authRoutes);
// Rutas de usuarios
router.use('/users', userRoutes);
// Rutas de clases
router.use('/classes', classRoutes);
// Rutas de estudiantes
router.use('/students', studentRoutes);
// Rutas de horarios
router.use('/schedules', scheduleRoutes);
// Rutas de sesiones de asistencia
router.use('/attendance-sessions', sessionRoutes);
// Rutas de registros de asistencia
router.use('/attendance-records', recordRoutes);

export default router;
