import express from 'express';
import { register, login, getMe, updateProfile } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimit.js';

const router = express.Router();

// Routes publiques. Le limiteur est posé ICI, sur les seules routes qui vérifient
// des identifiants, et non sur tout /api/auth : il y couvrait aussi GET /me, que
// le dashboard appelle à chaque chargement de page et qui répond 401 dès que le
// jeton est absent ou expiré. Comme seules les réponses en erreur sont comptées,
// dix chargements sans session suffisaient à interdire la connexion pendant un
// quart d'heure.
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Routes protégées
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, updateProfile);

export default router;
