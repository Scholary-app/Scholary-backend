import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { updateScheduleSchema } from '../schemas/schedule.schema.js';
import * as scheduleController from '../controllers/schedule.controller.js';

const router = express.Router();

router.use(authenticateToken);

// --- RUTAS DE HORARIOS (Directas por ID) ---
router.put('/:id', validate(updateScheduleSchema), scheduleController.updateSchedule);
router.delete('/:id', scheduleController.deleteSchedule);

export default router;