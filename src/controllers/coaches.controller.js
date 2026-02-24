import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

const prisma = new PrismaClient();

/**
 * Récupérer tous les coachs publics pour la recherche
 */
export const getAllCoaches = async (req, res) => {
  try {
    const { city, gym } = req.query;

    // Construire les filtres optionnels
    const whereFilter = {};
    if (city) {
      whereFilter.city = { contains: city, mode: 'insensitive' };
    }
    if (gym) {
      whereFilter.trainingLocations = { has: gym };
    }

    const coaches = await prisma.coachProfile.findMany({
      where: Object.keys(whereFilter).length > 0 ? whereFilter : undefined,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: false, // Ne pas exposer l'email
          },
        },
        posts: {
          where: {
            isPublic: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 3, // Seulement les 3 derniers posts pour la preview
          select: {
            id: true,
            mediaType: true,
            mediaUrl: true,
            createdAt: true,
          },
        },
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    });

    // Calculer le rating moyen pour chaque coach
    const coachesWithRating = coaches.map((coach) => {
      const { reviews, ...coachData } = coach;
      return coachData;
    });

    sendSuccess(res, coachesWithRating);
  } catch (error) {
    console.error('Get all coaches error:', error);
    sendError(res, 'Erreur lors de la récupération des coachs', 500);
  }
};

/**
 * Récupérer le profil public d'un coach
 */
export const getCoachProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const coach = await prisma.coachProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: false,
          },
        },
        posts: {
          where: {
            isPublic: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        reviews: {
          include: {
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
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!coach) {
      return sendError(res, 'Coach non trouvé', 404);
    }

    sendSuccess(res, coach);
  } catch (error) {
    console.error('Get coach profile error:', error);
    sendError(res, 'Erreur lors de la récupération du profil', 500);
  }
};

/**
 * Récupérer son propre profil coach (avec données complètes)
 */
export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const coach = await prisma.coachProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!coach) {
      return sendError(res, 'Profil coach non trouvé', 404);
    }

    sendSuccess(res, coach);
  } catch (error) {
    console.error('Get my profile error:', error);
    sendError(res, 'Erreur lors de la récupération du profil', 500);
  }
};

/**
 * Mettre à jour son profil coach
 */
export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bio, city, isRemote, trainingLocations } = req.body;

    // Récupérer le profil coach
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId },
    });

    if (!coachProfile) {
      return sendError(res, 'Profil coach non trouvé', 404);
    }

    // Gérer l'upload de la photo de profil si présente
    let profilePicture = coachProfile.profilePicture;
    if (req.file) {
      profilePicture = `/uploads/${req.file.filename}`;
    }

    // Parser trainingLocations si c'est une chaîne JSON
    let parsedLocations = trainingLocations;
    if (typeof trainingLocations === 'string') {
      try {
        parsedLocations = JSON.parse(trainingLocations);
      } catch (e) {
        parsedLocations = [];
      }
    }

    // Convertir isRemote en booléen si c'est une chaîne
    let parsedIsRemote = coachProfile.isRemote;
    if (isRemote !== undefined) {
      parsedIsRemote = isRemote === 'true' || isRemote === true;
    }

    // Mettre à jour le profil
    const updatedProfile = await prisma.coachProfile.update({
      where: { userId },
      data: {
        bio,
        city,
        isRemote: parsedIsRemote,
        trainingLocations: parsedLocations || [],
        profilePicture,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    sendSuccess(res, updatedProfile, 'Profil mis à jour avec succès');
  } catch (error) {
    console.error('Update profile error:', error);
    sendError(res, 'Erreur lors de la mise à jour du profil', 500);
  }
};
