import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import {
  getCoachClients,
  getClientById,
  getMyClientProfile,
  updateMyClientProfile
} from '../controllers/clients.controller.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// Routes pour les clients (leur propre profil)
router.get('/me', authorize('CLIENT'), getMyClientProfile);
router.put('/me', authorize('CLIENT'), upload.single('profilePicture'), updateMyClientProfile);

// Routes pour les coaches
router.get('/coach', authorize('COACH'), getCoachClients);
router.get('/:id', authorize('COACH'), getClientById);

export default router;
