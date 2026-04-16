import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { searchGyms, searchGymsInDb, getGymById } from '../controllers/gyms.controller.js';

const router = Router();

router.use(authenticate);

router.get('/search', searchGyms);
router.get('/db-search', searchGymsInDb);
router.get('/:id', getGymById);

export default router;
