import { Router } from 'express';
import { getMessages, sendMessage, getAnnouncements, createAnnouncement } from '../controllers/communicationController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/messages', authenticateToken, getMessages);
router.post('/messages', authenticateToken, sendMessage);

router.get('/announcements', authenticateToken, getAnnouncements);
router.post('/announcements', authenticateToken, requireRole(['admin', 'lecturer']), createAnnouncement);

export default router;
