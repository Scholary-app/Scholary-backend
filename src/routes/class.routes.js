import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { createClassSchema, updateClassSchema } from '../schemas/class.schema.js';
import { enrollStudentsSchema } from '../schemas/enrollment.schema.js';
import * as classController from '../controllers/class.controller.js';
import * as classroomImportController from '../controllers/classroom-import.controller.js';
import * as studentController from '../controllers/student.controller.js';
import { createScheduleSchema } from '../schemas/schedule.schema.js';
import { createSessionSchema } from '../schemas/attendance-session.schema.js';
import * as enrollmentController from '../controllers/enrollment.controller.js';
import * as scheduleController from '../controllers/schedule.controller.js';
import * as sessionController from '../controllers/attendance-session.controller.js';

const router = express.Router();

router.use(authenticateToken); // Protección global para todas las rutas de clases

// --- RUTAS DE IMPORTACIÓN DE GOOGLE CLASSROOM ---
router.get('/classroom/list', classroomImportController.getClassroomClassesList);
router.post('/classroom/import', classroomImportController.importFromClassroom);

router.get('/', classController.getAllClasses);
router.get('/:id', classController.getClassById);
router.post('/', validate(createClassSchema), classController.createClass);
router.put('/:id', validate(updateClassSchema), classController.updateClass);
router.delete('/:id', classController.deleteClass);

// --- RUTAS DE INSCRIPCIÓN (Class-Student) ---
router.post('/:classId/students', validate(enrollStudentsSchema), enrollmentController.enrollStudents);
router.get('/:classId/students', enrollmentController.getClassStudents);
router.get('/:classId/students/qrs', studentController.getClassStudentsQrs);
router.delete('/:classId/students/:studentId', enrollmentController.unenrollStudent);

// --- RUTAS DE HORARIOS (Ligados a la clase) ---
router.post('/:classId/schedules', validate(createScheduleSchema), scheduleController.createSchedule);
router.get('/:classId/schedules', scheduleController.getClassSchedules);

// --- RUTAS DE SESIONES DE ASISTENCIA ---
router.post('/:classId/attendance-sessions', validate(createSessionSchema), sessionController.createSession);
router.get('/:classId/attendance-sessions', sessionController.getClassSessions);

export default router;