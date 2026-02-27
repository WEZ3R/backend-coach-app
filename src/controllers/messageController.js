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
 * Récupérer le nombre de messages non lus par conversation
 * Retourne un objet { [interlocuteurProfileId]: count }
 */
export const getUnreadCountsByConversation = async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    if (role === 'COACH') {
      const coachProfile = await prisma.coachProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!coachProfile) return sendSuccess(res, {});

      const rows = await prisma.message.groupBy({
        by: ['clientId'],
        where: { coachId: coachProfile.id, isSentByCoach: false, isRead: false, type: 'CHAT' },
        _count: { id: true },
      });

      const counts = Object.fromEntries(rows.map((r) => [r.clientId, r._count.id]));
      return sendSuccess(res, counts);
    }

    // CLIENT
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!clientProfile) return sendSuccess(res, {});

    const rows = await prisma.message.groupBy({
      by: ['coachId'],
      where: { clientId: clientProfile.id, isSentByCoach: true, isRead: false, type: 'CHAT' },
      _count: { id: true },
    });

    const counts = Object.fromEntries(rows.map((r) => [r.coachId, r._count.id]));
    return sendSuccess(res, counts);
  } catch (error) {
    console.error('Get unread counts by conversation error:', error);
    sendError(res, 'Failed to get unread counts', 500);
  }
};

/**
 * Marquer tous les messages non lus d'une conversation comme lus
 */
export const markConversationAsRead = async (req, res) => {
  try {
    const { coachId, clientId } = req.params;
    const { role } = req.user;

    // Le client lit les messages du coach, le coach lit les messages du client
    const isSentByCoach = role === 'CLIENT';

    await prisma.message.updateMany({
      where: { coachId, clientId, isSentByCoach, isRead: false, type: 'CHAT' },
      data: { isRead: true },
    });

    sendSuccess(res, null, 'Conversation marked as read');
  } catch (error) {
    console.error('Mark conversation as read error:', error);
    sendError(res, 'Failed to mark conversation as read', 500);
  }
};

/**
 * Récupérer le nombre de messages non lus pour l'utilisateur connecté
 */
export const getUnreadCount = async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    if (role === 'COACH') {
      // Trouver le profil coach lié à cet utilisateur
      const coachProfile = await prisma.coachProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      if (!coachProfile) return sendSuccess(res, { count: 0 });

      const count = await prisma.message.count({
        where: {
          coachId: coachProfile.id,
          isSentByCoach: false,
          isRead: false,
          type: 'CHAT',
        },
      });

      return sendSuccess(res, { count });
    }

    // CLIENT
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!clientProfile) return sendSuccess(res, { count: 0 });

    const count = await prisma.message.count({
      where: {
        clientId: clientProfile.id,
        isSentByCoach: true,
        isRead: false,
        type: 'CHAT',
      },
    });

    return sendSuccess(res, { count });
  } catch (error) {
    console.error('Get unread count error:', error);
    sendError(res, 'Failed to get unread count', 500);
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
