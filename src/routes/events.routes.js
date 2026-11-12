import { Router } from 'express';
import { eventsController } from '../controllers/events.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', eventsController.list);
router.post('/', requireAuth, eventsController.create);
router.get('/:id/participants', eventsController.participants);
router.post('/:id/join', requireAuth, eventsController.join);
router.delete('/:id/leave', requireAuth, eventsController.leave);
router.get('/:id', eventsController.get);
router.put('/:id', requireAuth, eventsController.update);
router.delete('/:id', requireAuth, eventsController.remove);

export default router;
