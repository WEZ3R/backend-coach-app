import prisma from '../config/database.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * Recherche d'exercices dans le référentiel ExerciseDB
 * GET /api/exercise-refs/search?q=bench&limit=20
 *
 * Recherche multi-champs : name, bodyParts, targetMuscles, secondaryMuscles, equipments, exerciseType
 */
export const searchExerciseRefs = async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;

    if (!q || q.trim().length < 2) {
      return sendSuccess(res, { exercises: [], total: 0 });
    }

    const searchTerm = q.trim();
    const take = Math.min(parseInt(limit) || 20, 50);
    const skip = parseInt(offset) || 0;

    // Recherche ILIKE multi-champs avec OR
    const where = {
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { bodyParts: { hasSome: [searchTerm.toUpperCase()] } },
        { targetMuscles: { hasSome: [searchTerm] } },
        { secondaryMuscles: { hasSome: [searchTerm] } },
        { equipments: { hasSome: [searchTerm.toUpperCase()] } },
        { exerciseType: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    const [exercises, total] = await Promise.all([
      prisma.exerciseReference.findMany({
        where,
        take,
        skip,
        orderBy: [
          // Priorité aux résultats par nom (les plus pertinents)
          { name: 'asc' },
        ],
      }),
      prisma.exerciseReference.count({ where }),
    ]);

    sendSuccess(res, { exercises, total });
  } catch (error) {
    console.error('Search exercise refs error:', error);
    sendError(res, 'Failed to search exercises', 500);
  }
};

/**
 * Récupérer un exercice de référence par ID
 * GET /api/exercise-refs/:id
 */
export const getExerciseRefById = async (req, res) => {
  try {
    const { id } = req.params;

    const exerciseRef = await prisma.exerciseReference.findUnique({
      where: { id },
    });

    if (!exerciseRef) {
      return sendError(res, 'Exercise reference not found', 404);
    }

    sendSuccess(res, exerciseRef);
  } catch (error) {
    console.error('Get exercise ref error:', error);
    sendError(res, 'Failed to get exercise reference', 500);
  }
};
