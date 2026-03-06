import express from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { updateProfileSchema, updateSettingsSchema } from '../schemas/user.schema.js';
import * as userController from '../controllers/user.controller.js';

const router = express.Router();

// Todas las rutas en este archivo requieren autenticación
router.use(authenticateToken);

router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateProfileSchema), userController.updateProfile);
router.put('/settings', validate(updateSettingsSchema), userController.updateSettings);
router.delete('/account', userController.deleteAccount);

export default router;