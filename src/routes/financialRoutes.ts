import { Router } from 'express';
import { 
  getFeeStructures, 
  createFeeStructure, 
  getStudentFees, 
  assignFee, 
  recordPayment 
} from '../controllers/financialController';
import { authenticateToken, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/structures', authenticateToken, getFeeStructures);
router.post('/structures', authenticateToken, requireRole(['admin']), createFeeStructure);

router.get('/student-fees', authenticateToken, getStudentFees);
router.post('/assign', authenticateToken, requireRole(['admin']), assignFee);
router.post('/pay', authenticateToken, requireRole(['admin']), recordPayment);

export default router;
