import express from 'express';
import {
  getCoachClients,
  getClientStats,
  getClientProgress,
  getGoalsCompletion,
} from '../controllers/analyticsController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.get('/clients', authenticate, getCoachClients);
router.get('/stats', authenticate, getClientStats);
router.get('/progress', authenticate, getClientProgress);
router.get('/goals', authenticate, getGoalsCompletion);

export default router;
