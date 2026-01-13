import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

const prisma = new PrismaClient();

/**
 * Créer un nouveau post
 */
export const createPost = async (req, res) => {
  try {
    const { content, mediaType, isPublic } = req.body;
    const userId = req.user.id;

    // Récupérer le profil coach
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId },
    });

    if (!coachProfile) {
      return sendError(res, 'Profil coach non trouvé', 404);
    }

    // Gérer l'upload du média
    let mediaUrl = null;
    let finalMediaType = mediaType;

    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
      // Déterminer le type de média depuis le fichier si non fourni
      if (!finalMediaType) {
        finalMediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
      }
    }

    // Créer le post
    const post = await prisma.coachPost.create({
      data: {
        coachId: coachProfile.id,
        content,
        mediaType: finalMediaType,
        mediaUrl,
        isPublic: isPublic !== undefined ? isPublic : true,
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
    });

    sendSuccess(res, post, 'Post créé avec succès', 201);
  } catch (error) {
    console.error('Create post error:', error);
    sendError(res, 'Erreur lors de la création du post', 500);
  }
};

/**
 * Récupérer tous les posts d'un coach
 */
export const getCoachPosts = async (req, res) => {
  try {
    const { coachId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    // Vérifier si c'est une requête publique ou du coach lui-même
    const isOwner = req.user?.coachProfile?.id === coachId;

    const posts = await prisma.coachPost.findMany({
      where: {
        coachId,
        ...(isOwner ? {} : { isPublic: true }), // Ne montrer que les posts publics si ce n'est pas le coach
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
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    sendSuccess(res, posts);
  } catch (error) {
    console.error('Get coach posts error:', error);
    sendError(res, 'Erreur lors de la récupération des posts', 500);
  }
};

/**
 * Récupérer les posts du coach connecté
 */
export const getMyPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0 } = req.query;

    // Récupérer le profil coach
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId },
    });

    if (!coachProfile) {
      return sendError(res, 'Profil coach non trouvé', 404);
    }

    const posts = await prisma.coachPost.findMany({
      where: {
        coachId: coachProfile.id,
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
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    sendSuccess(res, posts);
  } catch (error) {
    console.error('Get my posts error:', error);
    sendError(res, 'Erreur lors de la récupération de vos posts', 500);
  }
};

/**
 * Mettre à jour un post
 */
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, mediaType, isPublic } = req.body;
    const userId = req.user.id;

    // Récupérer le profil coach
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId },
    });

    if (!coachProfile) {
      return sendError(res, 'Profil coach non trouvé', 404);
    }

    // Vérifier que le post appartient au coach
    const post = await prisma.coachPost.findUnique({
      where: { id },
    });

    if (!post) {
      return sendError(res, 'Post non trouvé', 404);
    }

    if (post.coachId !== coachProfile.id) {
      return sendError(res, 'Non autorisé à modifier ce post', 403);
    }

    // Gérer l'upload du média si nouveau fichier
    let mediaUrl = post.mediaUrl; // Garder l'ancienne URL par défaut
    let finalMediaType = mediaType || post.mediaType;

    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
      finalMediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
    }

    // Préparer les données de mise à jour
    const updateData = {
      content,
      mediaType: finalMediaType,
      mediaUrl,
    };

    // Ajouter isPublic seulement s'il est défini
    if (isPublic !== undefined) {
      updateData.isPublic = isPublic;
    }

    // Mettre à jour le post
    const updatedPost = await prisma.coachPost.update({
      where: { id },
      data: updateData,
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
    });

    sendSuccess(res, updatedPost, 'Post mis à jour avec succès');
  } catch (error) {
    console.error('Update post error:', error);
    sendError(res, 'Erreur lors de la mise à jour du post', 500);
  }
};

/**
 * Supprimer un post
 */
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Récupérer le profil coach
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId },
    });

    if (!coachProfile) {
      return sendError(res, 'Profil coach non trouvé', 404);
    }

    // Vérifier que le post appartient au coach
    const post = await prisma.coachPost.findUnique({
      where: { id },
    });

    if (!post) {
      return sendError(res, 'Post non trouvé', 404);
    }

    if (post.coachId !== coachProfile.id) {
      return sendError(res, 'Non autorisé à supprimer ce post', 403);
    }

    // Supprimer le post
    await prisma.coachPost.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Post supprimé avec succès');
  } catch (error) {
    console.error('Delete post error:', error);
    sendError(res, 'Erreur lors de la suppression du post', 500);
  }
};
