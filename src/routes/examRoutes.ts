import { Router } from 'express';
import { getExams, createExam, allocateSeats } from '../controllers/examController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getExams);
router.post('/', authenticateToken, requireRole(['admin', 'lecturer']), createExam);
router.post('/:exam_id/allocate', authenticateToken, requireRole(['admin', 'lecturer']), allocateSeats);

export default router;
