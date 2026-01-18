import { Router } from 'express';
import { 
  getAllOfferings, 
  getOfferingById, 
  createOffering, 
  updateOffering, 
  deleteOffering,
  getAcademicPeriods
} from '../controllers/offeringController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Public/Student access (read-only)
router.get('/', authenticateToken, getAllOfferings);
router.get('/periods', authenticateToken, getAcademicPeriods); // Helper to get periods
router.get('/:id', authenticateToken, getOfferingById);

// Admin only
router.post('/', authenticateToken, requireRole(['admin']), createOffering);
router.put('/:id', authenticateToken, requireRole(['admin']), updateOffering);
router.delete('/:id', authenticateToken, requireRole(['admin']), deleteOffering);

export default router;
