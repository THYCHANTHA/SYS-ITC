import { Router } from 'express';
import { getGrades, updateGrades } from '../controllers/gradeController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getGrades);
router.put('/:id', authenticateToken, requireRole(['admin', 'lecturer']), updateGrades);

export default router;
