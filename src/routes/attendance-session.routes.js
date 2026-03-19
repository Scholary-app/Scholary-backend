import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { updateSessionSchema } from '../schemas/attendance-session.schema.js';
import * as sessionController from '../controllers/attendance-session.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/:id', sessionController.getSessionById);
router.put('/:id', validate(updateSessionSchema), sessionController.updateSession);
router.delete('/:id', sessionController.deleteSession);

export default router;