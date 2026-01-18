import { Router } from 'express';
import { 
  getSessions, 
  createSession, 
  getSessionAttendance, 
  markAttendance,
  getStudentAttendanceReport
} from '../controllers/attendanceController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/sessions', authenticateToken, getSessions);
router.post('/sessions', authenticateToken, requireRole(['admin', 'lecturer']), createSession);
router.get('/sessions/:session_id', authenticateToken, getSessionAttendance);
router.post('/mark', authenticateToken, requireRole(['admin', 'lecturer']), markAttendance);
router.get('/report', authenticateToken, getStudentAttendanceReport);

export default router;
