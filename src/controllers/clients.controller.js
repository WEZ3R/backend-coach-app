import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

const prisma = new PrismaClient();

// Récupérer tous les clients d'un coach (y compris les demandes en attente)
export const getCoachClients = async (req, res) => {
  try {
    const coachId = req.user.id;

    // Récupérer le profil coach
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId: coachId },
    });

    if (!coachProfile) {
      return res.status(404).json({
        success: false,
        message: 'Profil coach non trouvé',
      });
    }

    // Récupérer tous les clients via la table ClientCoach (relation many-to-many)
    const clientCoachRelations = await prisma.clientCoach.findMany({
      where: {
        coachId: coachProfile.id,
        isActive: true,
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
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

    // Récupérer les demandes en attente
    const pendingRequests = await prisma.coachRequest.findMany({
      where: {
        coachId: coachProfile.id,
        status: 'pending',
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
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

    // Formater les demandes pour correspondre au format des clients
    const formattedPendingRequests = pendingRequests.map(request => ({
      ...request.client,
      requestId: request.id,
      requestStatus: 'pending',
      requestMessage: request.message,
      requestDate: request.createdAt,
    }));

    // Formater les clients acceptés depuis ClientCoach
    const formattedAcceptedClients = clientCoachRelations.map(relation => ({
      ...relation.client,
      requestStatus: 'accepted',
      isPrimaryCoach: relation.isPrimary,
      relationStartDate: relation.startDate,
    }));

    // Combiner les deux listes
    const allClients = [...formattedPendingRequests, ...formattedAcceptedClients];

    res.json({
      success: true,
      data: allClients,
    });
  } catch (error) {
    console.error('Error fetching coach clients:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des clients',
      error: error.message,
    });
  }
};

// Récupérer un client spécifique (ou une demande en attente)
export const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const coachId = req.user.id;

    // Récupérer le profil coach
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId: coachId },
    });

    if (!coachProfile) {
      return res.status(404).json({
        success: false,
        message: 'Profil coach non trouvé',
      });
    }

    // Essayer de récupérer le client via ClientCoach
    const clientCoachRelation = await prisma.clientCoach.findFirst({
      where: {
        clientId: id,
        coachId: coachProfile.id,
        isActive: true,
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (clientCoachRelation) {
      // Client accepté trouvé
      return res.json({
        success: true,
        data: {
          ...clientCoachRelation.client,
          requestStatus: 'accepted',
          isPrimaryCoach: clientCoachRelation.isPrimary,
          relationStartDate: clientCoachRelation.startDate,
        },
      });
    }

    // Sinon, vérifier si c'est une demande en attente
    const request = await prisma.coachRequest.findFirst({
      where: {
        coachId: coachProfile.id,
        clientId: id,
        status: 'pending',
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (request) {
      // Demande en attente trouvée
      return res.json({
        success: true,
        data: {
          ...request.client,
          requestId: request.id,
          requestStatus: 'pending',
          requestMessage: request.message,
          requestDate: request.createdAt,
        },
      });
    }

    // Ni client accepté ni demande en attente
    return res.status(404).json({
      success: false,
      message: 'Client non trouvé',
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du client',
      error: error.message,
    });
  }
};

/**
 * Récupérer son propre profil client (avec données complètes)
 */
export const getMyClientProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const client = await prisma.clientProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            birthDate: true,
          },
        },
        // Coach principal (rétrocompatibilité)
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
        // Tous les coaches via la relation many-to-many
        coaches: {
          where: { isActive: true },
          include: {
            coach: {
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
          orderBy: [
            { isPrimary: 'desc' },
            { startDate: 'asc' },
          ],
        },
      },
    });

    if (!client) {
      return sendError(res, 'Profil client non trouvé', 404);
    }

    sendSuccess(res, client);
  } catch (error) {
    console.error('Get my client profile error:', error);
    sendError(res, 'Erreur lors de la récupération du profil', 500);
  }
};

/**
 * Mettre à jour son profil client
 */
export const updateMyClientProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { goals, level, weight, height, gender } = req.body;

    // Récupérer le profil client
    const clientProfile = await prisma.clientProfile.findUnique({
      where: { userId },
    });

    if (!clientProfile) {
      return sendError(res, 'Profil client non trouvé', 404);
    }

    // Gérer l'upload de la photo de profil si présente
    let profilePicture = clientProfile.profilePicture;
    if (req.file) {
      profilePicture = `/uploads/${req.file.filename}`;
    }

    // Mettre à jour le profil
    const updatedProfile = await prisma.clientProfile.update({
      where: { userId },
      data: {
        goals,
        level,
        weight: weight ? parseFloat(weight) : clientProfile.weight,
        height: height ? parseFloat(height) : clientProfile.height,
        gender,
        profilePicture,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            birthDate: true,
          },
        },
      },
    });

    sendSuccess(res, updatedProfile, 'Profil mis à jour avec succès');
  } catch (error) {
    console.error('Update client profile error:', error);
    sendError(res, 'Erreur lors de la mise à jour du profil', 500);
  }
};
