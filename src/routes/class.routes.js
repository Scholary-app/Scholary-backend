import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { createClassSchema, updateClassSchema } from '../schemas/class.schema.js';
import * as classController from '../controllers/class.controller.js';

const router = express.Router();

router.use(authenticateToken); // Protección global para todas las rutas de clases

router.get('/', classController.getAllClasses);
router.get('/:id', classController.getClassById);
router.post('/', validate(createClassSchema), classController.createClass);
router.put('/:id', validate(updateClassSchema), classController.updateClass);
router.delete('/:id', classController.deleteClass);

export default router;