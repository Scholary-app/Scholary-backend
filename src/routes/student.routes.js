import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { createStudentSchema, updateStudentSchema } from '../schemas/student.schema.js';
import * as studentController from '../controllers/student.controller.js';

const router = express.Router();

router.use(authenticateToken); // Protección global

router.get('/', studentController.getAllStudents);
router.get('/:id', studentController.getStudentById);
router.post('/', validate(createStudentSchema), studentController.createStudent);
router.put('/:id', validate(updateStudentSchema), studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

// Endpoint especial para el QR
router.get('/:id/qr', studentController.getStudentQR);

export default router;