import { Router } from 'express';
import { 
  getAllCourses, 
  getCourseById, 
  createCourse, 
  updateCourse, 
  deleteCourse 
} from '../controllers/courseController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// All authenticated users can view courses
router.get('/', authenticateToken, getAllCourses);
router.get('/:id', authenticateToken, getCourseById);

// Only admins can modify courses
router.post('/', authenticateToken, requireRole(['admin']), createCourse);
router.put('/:id', authenticateToken, requireRole(['admin']), updateCourse);
router.delete('/:id', authenticateToken, requireRole(['admin']), deleteCourse);

export default router;
