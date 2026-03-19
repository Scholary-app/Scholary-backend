import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { updateSessionSchema } from '../schemas/attendance-session.schema.js';
import { createRecordSchema, scanRecordSchema } from '../schemas/attendance-record.schema.js';
import * as sessionController from '../controllers/attendance-session.controller.js';
import * as recordController from '../controllers/attendance-record.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/:id', sessionController.getSessionById);
router.put('/:id', validate(updateSessionSchema), sessionController.updateSession);
router.delete('/:id', sessionController.deleteSession);

// --- RUTAS DE REGISTROS DE ASISTENCIA (Ligados a la sesión) ---
router.post('/:sessionId/records', validate(createRecordSchema), recordController.createRecord);
router.post('/:sessionId/scan', validate(scanRecordSchema), recordController.scanRecord);
router.get('/:sessionId/records', recordController.getSessionRecords);

export default router;