import prisma from '../config/database.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * Toggle completion of a specific set
 */
export const toggleSetCompletion = async (req, res) => {
  try {
    const { exerciseId, setNumber, repsAchieved, weightUsed } = req.body;

    // Check if completion already exists
    const existing = await prisma.setCompletion.findUnique({
      where: {
        exerciseId_setNumber: {
          exerciseId,
          setNumber,
        },
      },
    });

    if (existing) {
      // Delete if exists (toggle off)
      await prisma.setCompletion.delete({
        where: {
          exerciseId_setNumber: {
            exerciseId,
            setNumber,
          },
        },
      });
      sendSuccess(res, { completed: false }, 'Set unmarked');
    } else {
      // Create if doesn't exist (toggle on)
      const completion = await prisma.setCompletion.create({
        data: {
          exerciseId,
          setNumber,
          repsAchieved,
          weightUsed,
          completed: true,
        },
      });
      sendSuccess(res, completion, 'Set completed', 201);
    }
  } catch (error) {
    console.error('Toggle set completion error:', error);
    sendError(res, 'Failed to toggle set completion', 500);
  }
};

/**
 * Update set completion (reps/weight)
 */
export const updateSetCompletion = async (req, res) => {
  try {
    const { exerciseId, setNumber, repsAchieved, weightUsed } = req.body;

    const completion = await prisma.setCompletion.upsert({
      where: {
        exerciseId_setNumber: {
          exerciseId,
          setNumber,
        },
      },
      update: {
        repsAchieved,
        weightUsed,
      },
      create: {
        exerciseId,
        setNumber,
        repsAchieved,
        weightUsed,
        completed: true,
      },
    });

    sendSuccess(res, completion, 'Set completion updated');
  } catch (error) {
    console.error('Update set completion error:', error);
    sendError(res, 'Failed to update set completion', 500);
  }
};

/**
 * Get all set completions for an exercise
 */
export const getSetCompletions = async (req, res) => {
  try {
    const { exerciseId } = req.params;

    const completions = await prisma.setCompletion.findMany({
      where: { exerciseId },
      orderBy: { setNumber: 'asc' },
    });

    sendSuccess(res, completions);
  } catch (error) {
    console.error('Get set completions error:', error);
    sendError(res, 'Failed to get set completions', 500);
  }
};

/**
 * Get all set completions for a session
 */
export const getSessionSetCompletions = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get all exercises for this session
    const exercises = await prisma.exercise.findMany({
      where: { sessionId },
      include: {
        setCompletions: {
          orderBy: { setNumber: 'asc' },
        },
      },
    });

    sendSuccess(res, exercises);
  } catch (error) {
    console.error('Get session set completions error:', error);
    sendError(res, 'Failed to get session set completions', 500);
  }
};

/**
 * Delete a set completion
 */
export const deleteSetCompletion = async (req, res) => {
  try {
    const { exerciseId, setNumber } = req.params;

    await prisma.setCompletion.delete({
      where: {
        exerciseId_setNumber: {
          exerciseId,
          setNumber: parseInt(setNumber),
        },
      },
    });

    sendSuccess(res, null, 'Set completion deleted');
  } catch (error) {
    console.error('Delete set completion error:', error);
    sendError(res, 'Failed to delete set completion', 500);
  }
};
