import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { updateRecordSchema } from '../schemas/attendance-record.schema.js';
import * as recordController from '../controllers/attendance-record.controller.js';

const router = express.Router();

router.use(authenticateToken);

router.put('/:id', validate(updateRecordSchema), recordController.updateRecord);
router.delete('/:id', recordController.deleteRecord);

export default router;