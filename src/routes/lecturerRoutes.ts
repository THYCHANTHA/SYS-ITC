import { Router } from 'express';
import {
  getAllLecturers,
  getLecturerById,
  createLecturer,
  updateLecturer,
  deleteLecturer
} from '../controllers/lecturerController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getAllLecturers);
router.get('/:id', authenticateToken, getLecturerById);
router.post('/', authenticateToken, requireRole(['admin']), createLecturer);
router.put('/:id', authenticateToken, requireRole(['admin']), updateLecturer);
router.delete('/:id', authenticateToken, requireRole(['admin']), deleteLecturer);

export default router;
