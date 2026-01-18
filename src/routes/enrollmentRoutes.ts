import { Router } from 'express';
import { 
  getEnrollments, 
  createEnrollment, 
  updateEnrollmentStatus, 
  deleteEnrollment 
} from '../controllers/enrollmentController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Students can view their own enrollments and enroll themselves
router.get('/', authenticateToken, getEnrollments);
router.post('/', authenticateToken, createEnrollment);

// Only admins can update status (drop/complete) or delete
router.put('/:id', authenticateToken, requireRole(['admin']), updateEnrollmentStatus);
router.delete('/:id', authenticateToken, requireRole(['admin']), deleteEnrollment);

export default router;
