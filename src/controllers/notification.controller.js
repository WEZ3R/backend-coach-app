import prisma from '../config/database.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

// GET /api/notifications
export const getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    sendSuccess(res, notifications);
  } catch (error) {
    console.error('getNotifications error:', error);
    sendError(res, 'Échec de la récupération des notifications', 500);
  }
};

// GET /api/notifications/unread-count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    sendSuccess(res, { count });
  } catch (error) {
    console.error('getUnreadCount error:', error);
    sendError(res, 'Échec', 500);
  }
};

// PUT /api/notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id, userId: req.user.id },
      data: { isRead: true },
    });
    sendSuccess(res, null, 'Notification lue');
  } catch (error) {
    console.error('markAsRead error:', error);
    sendError(res, 'Échec', 500);
  }
};

// PUT /api/notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    sendSuccess(res, null, 'Toutes les notifications lues');
  } catch (error) {
    console.error('markAllAsRead error:', error);
    sendError(res, 'Échec', 500);
  }
};
