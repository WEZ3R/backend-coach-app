import express from 'express';
import { register, login, getMe, updateProfile } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Routes publiques
router.post('/register', register);
router.post('/login', login);

// Routes protégées
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

export default router;
