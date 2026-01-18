import { Router } from 'express';
import { getAssignments, createAssignment, submitAssignment, getSubmissions } from '../controllers/assignmentController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getAssignments);
router.post('/', authenticateToken, requireRole(['admin', 'lecturer']), createAssignment);
router.post('/submit', authenticateToken, requireRole(['student']), submitAssignment);
router.get('/:assignment_id/submissions', authenticateToken, requireRole(['admin', 'lecturer']), getSubmissions);

export default router;
