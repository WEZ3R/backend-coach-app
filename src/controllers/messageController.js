import prisma from '../config/database.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * Envoyer un message
 */
export const sendMessage = async (req, res) => {
  try {
    const { coachId, clientId, content, type, scheduledTime, isSentByCoach } = req.body;

    const message = await prisma.message.create({
      data: {
        coachId,
        clientId,
        content,
        type: type || 'CHAT',
        scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
        isSentByCoach,
      },
    });

    sendSuccess(res, message, 'Message sent successfully', 201);
  } catch (error) {
    console.error('Send message error:', error);
    sendError(res, 'Failed to send message', 500);
  }
};

/**
 * Récupérer la conversation entre un coach et un client
 */
export const getConversation = async (req, res) => {
  try {
    const { coachId, clientId } = req.params;

    const messages = await prisma.message.findMany({
      where: {
        coachId,
        clientId,
        type: 'CHAT',
      },
      orderBy: { createdAt: 'asc' },
    });

    sendSuccess(res, messages);
  } catch (error) {
    console.error('Get conversation error:', error);
    sendError(res, 'Failed to get conversation', 500);
  }
};

/**
 * Récupérer les tips d'un client
 */
export const getClientTips = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { upcoming } = req.query; // Si true, récupérer seulement les tips futurs

    const where = {
      clientId,
      type: 'TIP',
      ...(upcoming && {
        scheduledTime: {
          gte: new Date(),
        },
      }),
    };

    const tips = await prisma.message.findMany({
      where,
      orderBy: { scheduledTime: 'asc' },
    });

    sendSuccess(res, tips);
  } catch (error) {
    console.error('Get tips error:', error);
    sendError(res, 'Failed to get tips', 500);
  }
};

/**
 * Marquer un message comme lu
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const message = await prisma.message.update({
      where: { id },
      data: { isRead: true },
    });

    sendSuccess(res, message, 'Message marked as read');
  } catch (error) {
    console.error('Mark as read error:', error);
    sendError(res, 'Failed to mark message as read', 500);
  }
};

/**
 * Supprimer un message
 */
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.message.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Message deleted successfully');
  } catch (error) {
    console.error('Delete message error:', error);
    sendError(res, 'Failed to delete message', 500);
  }
};
