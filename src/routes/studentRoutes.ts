import { Router } from 'express';
import { getAllStudents, createStudent, deleteStudent, updateStudent, getStudentById } from '../controllers/studentController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Protect all routes
router.get('/', authenticateToken, getAllStudents);
router.get('/:id', authenticateToken, getStudentById);

// Only admins can create/update/delete students
router.post('/', authenticateToken, requireRole(['admin']), createStudent);
router.put('/:id', authenticateToken, requireRole(['admin']), updateStudent);
router.delete('/:id', authenticateToken, requireRole(['admin']), deleteStudent);

export default router;
