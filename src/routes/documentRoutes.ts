import { Router } from 'express';
import { getTranscriptData } from '../controllers/documentController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.get('/transcript/:student_id', authenticateToken, getTranscriptData);

export default router;
