import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import { getAllCoaches, getCoachProfile, getMyProfile, updateMyProfile } from '../controllers/coaches.controller.js';
import { upsertReview, deleteReview } from '../controllers/reviewController.js';

const router = express.Router();

// Routes publiques
router.get('/', getAllCoaches);
router.get('/public/:id', getCoachProfile);

// Routes protégées
router.get('/me', authenticate, getMyProfile);
router.put('/me', authenticate, upload.single('profilePicture'), updateMyProfile);

// Avis (client authentifié uniquement)
router.post('/:coachId/reviews', authenticate, upsertReview);
router.delete('/:coachId/reviews', authenticate, deleteReview);

export default router;
