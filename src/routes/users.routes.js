import { Router } from 'express';
import { usersController } from '../controllers/users.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', usersController.register);
router.post('/login', usersController.login);
router.get('/me', requireAuth, usersController.me);
router.put('/me', requireAuth, usersController.updateMe);

export default router;
