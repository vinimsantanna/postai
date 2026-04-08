import { Router } from 'express';
import { authController } from '@/api/controllers/auth.controller';
import { authLimiter } from '@/api/middleware/rate-limit.middleware';

const router = Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

export default router;
