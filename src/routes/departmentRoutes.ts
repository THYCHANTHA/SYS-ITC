import { Router } from 'express';
import { getAllDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/departmentController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getAllDepartments);
router.post('/', authenticateToken, requireRole(['admin']), createDepartment);
router.put('/:id', authenticateToken, requireRole(['admin']), updateDepartment);
router.delete('/:id', authenticateToken, requireRole(['admin']), deleteDepartment);

export default router;
