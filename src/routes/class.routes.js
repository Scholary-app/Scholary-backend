import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { createClassSchema, updateClassSchema } from '../schemas/class.schema.js';
import { enrollStudentsSchema } from '../schemas/enrollment.schema.js';
import * as classController from '../controllers/class.controller.js';
import { createScheduleSchema } from '../schemas/schedule.schema.js';
import * as enrollmentController from '../controllers/enrollment.controller.js';
import * as scheduleController from '../controllers/schedule.controller.js';

const router = express.Router();

router.use(authenticateToken); // Protección global para todas las rutas de clases

router.get('/', classController.getAllClasses);
router.get('/:id', classController.getClassById);
router.post('/', validate(createClassSchema), classController.createClass);
router.put('/:id', validate(updateClassSchema), classController.updateClass);
router.delete('/:id', classController.deleteClass);

// --- RUTAS DE INSCRIPCIÓN (Class-Student) ---
router.post('/:classId/students', validate(enrollStudentsSchema), enrollmentController.enrollStudents);
router.get('/:classId/students', enrollmentController.getClassStudents);
router.delete('/:classId/students/:studentId', enrollmentController.unenrollStudent);

// --- RUTAS DE HORARIOS (Ligados a la clase) ---
router.post('/:classId/schedules', validate(createScheduleSchema), scheduleController.createSchedule);
router.get('/:classId/schedules', scheduleController.getClassSchedules);

export default router;