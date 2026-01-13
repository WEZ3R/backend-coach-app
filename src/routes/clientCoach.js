import express from 'express';
import {
  addCoachToClient,
  getClientCoaches,
  getCoachClients,
  setPrimaryCoach,
  removeCoachFromClient,
} from '../controllers/clientCoachController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes pour la gestion des relations client-coach
router.post('/', addCoachToClient);
router.get('/client/:clientId', getClientCoaches);
router.get('/coach/:coachId', getCoachClients);
router.patch('/:id/primary', setPrimaryCoach);
router.delete('/:id', removeCoachFromClient);

export default router;
