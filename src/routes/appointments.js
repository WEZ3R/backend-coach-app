import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import {
  createAppointment,
  getAppointments,
  getUpcomingAppointments,
  getAppointmentById,
  confirmAppointment,
  cancelAppointment,
  deleteAppointment,
} from '../controllers/appointment.controller.js';

const router = express.Router();
router.use(authenticate);

router.post('/',              authorize('COACH'),  createAppointment);
router.get('/',                                   getAppointments);
router.get('/upcoming',                           getUpcomingAppointments);
router.get('/:id',                                getAppointmentById);
router.put('/:id/confirm',    authorize('CLIENT'), confirmAppointment);
router.put('/:id/cancel',                         cancelAppointment);
router.delete('/:id',         authorize('COACH'),  deleteAppointment);

export default router;
