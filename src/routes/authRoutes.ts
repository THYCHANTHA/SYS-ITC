import { Router } from 'express';
import { register, login, changePassword, getUsers } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/change-password', authenticateToken, changePassword);
router.get('/users', authenticateToken, getUsers);

export default router;
