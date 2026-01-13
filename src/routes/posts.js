import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import {
  createPost,
  getCoachPosts,
  getMyPosts,
  updatePost,
  deletePost,
} from '../controllers/posts.controller.js';

const router = express.Router();

// Routes protégées (nécessitent authentification)
router.post('/', authenticate, upload.single('media'), createPost);
router.get('/my-posts', authenticate, getMyPosts);
router.put('/:id', authenticate, upload.single('media'), updatePost);
router.delete('/:id', authenticate, deletePost);

// Routes publiques (ou semi-publiques)
router.get('/coach/:coachId', getCoachPosts); // Peut être appelé avec ou sans auth

export default router;
