import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

const prisma = new PrismaClient();

/**
 * Créer une demande d'entraînement
 */
export const createRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { coachId, message } = req.body;

    if (!coachId || !message) {
      return sendError(res, 'Le coach et le message sont requis', 400);
    }

    // Récupérer le profil client
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId },
    });

    if (!clientProfile) {
      return sendError(res, 'Profil client non trouvé', 404);
    }

    // Vérifier que le client n'a pas déjà un coach assigné
    if (clientProfile.coachId) {
      return sendError(res, 'Vous avez déjà un coach assigné. Utilisez la messagerie pour communiquer avec votre coach.', 400);
    }

    // Vérifier que le coach existe
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { id: coachId },
    });

    if (!coachProfile) {
      return sendError(res, 'Coach non trouvé', 404);
    }

    // Vérifier qu'une demande n'existe pas déjà
    const existingRequest = await prisma.coachRequest.findUnique({
      where: {
        coachId_clientId: {
          coachId,
          clientId: clientProfile.id,
        },
      },
    });

    if (existingRequest) {
      return sendError(res, 'Vous avez déjà envoyé une demande à ce coach', 400);
    }

    // Créer la demande
    const request = await prisma.coachRequest.create({
      data: {
        coachId,
        clientId: clientProfile.id,
        message,
      },
      include: {
        coach: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        client: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    sendSuccess(res, request, 'Demande envoyée avec succès');
  } catch (error) {
    console.error('Create request error:', error);
    sendError(res, 'Erreur lors de l\'envoi de la demande', 500);
  }
};

/**
 * Récupérer les demandes reçues (pour le coach)
 */
export const getReceivedRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer le profil coach
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId },
    });

    if (!coachProfile) {
      return sendError(res, 'Profil coach non trouvé', 404);
    }

    const requests = await prisma.coachRequest.findMany({
      where: {
        coachId: coachProfile.id,
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    sendSuccess(res, requests);
  } catch (error) {
    console.error('Get received requests error:', error);
    sendError(res, 'Erreur lors de la récupération des demandes', 500);
  }
};

/**
 * Récupérer les demandes envoyées (pour le client)
 */
export const getSentRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer le profil client
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId },
    });

    if (!clientProfile) {
      return sendError(res, 'Profil client non trouvé', 404);
    }

    const requests = await prisma.coachRequest.findMany({
      where: {
        clientId: clientProfile.id,
      },
      include: {
        coach: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    sendSuccess(res, requests);
  } catch (error) {
    console.error('Get sent requests error:', error);
    sendError(res, 'Erreur lors de la récupération des demandes', 500);
  }
};

/**
 * Accepter une demande
 */
export const acceptRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    // Récupérer le profil coach
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId },
    });

    if (!coachProfile) {
      return sendError(res, 'Profil coach non trouvé', 404);
    }

    // Récupérer la demande
    const request = await prisma.coachRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return sendError(res, 'Demande non trouvée', 404);
    }

    // Vérifier que la demande est bien pour ce coach
    if (request.coachId !== coachProfile.id) {
      return sendError(res, 'Vous n\'êtes pas autorisé à accepter cette demande', 403);
    }

    // Accepter la demande et assigner le client au coach
    const [updatedRequest, updatedClient] = await prisma.$transaction([
      prisma.coachRequest.update({
        where: { id: requestId },
        data: { status: 'accepted' },
      }),
      prisma.clientProfile.update({
        where: { id: request.clientId },
        data: { coachId: coachProfile.id },
      }),
    ]);

    sendSuccess(res, updatedRequest, 'Demande acceptée avec succès');
  } catch (error) {
    console.error('Accept request error:', error);
    sendError(res, 'Erreur lors de l\'acceptation de la demande', 500);
  }
};

/**
 * Refuser une demande
 */
export const rejectRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    // Récupérer le profil coach
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId },
    });

    if (!coachProfile) {
      return sendError(res, 'Profil coach non trouvé', 404);
    }

    // Récupérer la demande
    const request = await prisma.coachRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return sendError(res, 'Demande non trouvée', 404);
    }

    // Vérifier que la demande est bien pour ce coach
    if (request.coachId !== coachProfile.id) {
      return sendError(res, 'Vous n\'êtes pas autorisé à refuser cette demande', 403);
    }

    // Refuser la demande
    const updatedRequest = await prisma.coachRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' },
    });

    sendSuccess(res, updatedRequest, 'Demande refusée');
  } catch (error) {
    console.error('Reject request error:', error);
    sendError(res, 'Erreur lors du refus de la demande', 500);
  }
};
