import prisma from '../config/database.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

/**
 * Récupérer la liste de tous les clients du coach
 */
export const getCoachClients = async (req, res) => {
  try {
    // Récupérer le profil coach
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!coachProfile) {
      return sendError(res, 'Profil coach non trouvé', 403);
    }

    const coachId = coachProfile.id;

    const clients = await prisma.clientProfile.findMany({
      where: {
        coachId: coachId,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const clientList = clients.map(client => ({
      id: client.id,
      name: `${client.user.firstName} ${client.user.lastName}`,
    }));

    sendSuccess(res, clientList);
  } catch (error) {
    console.error('Get coach clients error:', error);
    sendError(res, 'Erreur lors de la récupération des clients', 500);
  }
};

/**
 * Récupérer les statistiques d'un ou plusieurs clients
 */
export const getClientStats = async (req, res) => {
  try {
    const { clientIds, startDate, endDate, metrics } = req.query;
    console.log('=== getClientStats called ===');
    console.log('req.query:', req.query);
    console.log('req.user:', req.user);

    // Récupérer le profil coach
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId: req.user.id },
    });

    console.log('coachProfile:', coachProfile);

    if (!coachProfile) {
      console.log('ERROR: No coachProfile found');
      return sendError(res, 'Profil coach non trouvé', 403);
    }

    const coachId = coachProfile.id;
    console.log('coachId:', coachId);

    // Si clientIds est fourni, le parser, sinon récupérer tous les clients du coach
    let whereClause = { coachId: coachId };

    if (clientIds) {
      const clientIdArray = Array.isArray(clientIds) ? clientIds : [clientIds];
      console.log('clientIdArray:', clientIdArray);
      whereClause.id = { in: clientIdArray };
    }

    console.log('whereClause:', whereClause);

    // Récupérer les clients du coach (tous ou filtrés)
    const clients = await prisma.clientProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (clients.length === 0) {
      return sendError(res, 'Aucun client trouvé', 404);
    }

    // Filtrer par date si spécifié
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Récupérer les statistiques pour chaque client
    const statsData = await Promise.all(
      clients.map(async (client) => {
        const stats = await prisma.dailyStat.findMany({
          where: {
            clientId: client.id,
            ...(Object.keys(dateFilter).length > 0 && {
              date: dateFilter,
            }),
          },
          orderBy: {
            date: 'asc',
          },
        });

        return {
          clientId: client.id,
          clientName: `${client.user.firstName} ${client.user.lastName}`,
          stats: stats,
        };
      })
    );

    sendSuccess(res, statsData);
  } catch (error) {
    console.error('Get client stats error:', error);
    sendError(res, 'Erreur lors de la récupération des statistiques', 500);
  }
};

/**
 * Récupérer les données de progression des séances
 */
export const getClientProgress = async (req, res) => {
  try {
    const { clientIds, startDate, endDate } = req.query;

    // Récupérer le profil coach
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!coachProfile) {
      return sendError(res, 'Profil coach non trouvé', 403);
    }

    const coachId = coachProfile.id;

    const clientIdArray = Array.isArray(clientIds) ? clientIds : [clientIds];

    // Récupérer les programmes des clients
    const programs = await prisma.program.findMany({
      where: {
        coachId: coachId,
        clientId: { in: clientIdArray },
      },
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
        sessions: {
          where: {
            ...(startDate && endDate
              ? {
                  date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                  },
                }
              : {}),
          },
          orderBy: {
            date: 'asc',
          },
        },
      },
    });

    const progressData = programs.map((program) => {
      const completedSessions = program.sessions.filter(
        (s) => s.status === 'DONE'
      ).length;
      const totalSessions = program.sessions.length;
      const completionRate =
        totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

      return {
        clientId: program.clientId,
        clientName: `${program.client.user.firstName} ${program.client.user.lastName}`,
        programTitle: program.title,
        completedSessions,
        totalSessions,
        completionRate: Math.round(completionRate),
        sessions: program.sessions.map((s) => ({
          date: s.date,
          status: s.status,
          isRestDay: s.isRestDay,
        })),
      };
    });

    sendSuccess(res, progressData);
  } catch (error) {
    console.error('Get client progress error:', error);
    sendError(res, 'Erreur lors de la récupération de la progression', 500);
  }
};

/**
 * Récupérer les objectifs personnalisés et leur completion
 */
export const getGoalsCompletion = async (req, res) => {
  try {
    const { clientIds, startDate, endDate } = req.query;

    // Récupérer le profil coach
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!coachProfile) {
      return sendError(res, 'Profil coach non trouvé', 403);
    }

    const coachId = coachProfile.id;

    const clientIdArray = Array.isArray(clientIds) ? clientIds : [clientIds];

    // Récupérer les programmes et objectifs
    const programs = await prisma.program.findMany({
      where: {
        coachId: coachId,
        clientId: { in: clientIdArray },
      },
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
        customGoals: {
          include: {
            completions: {
              where: {
                ...(startDate && endDate
                  ? {
                      date: {
                        gte: new Date(startDate),
                        lte: new Date(endDate),
                      },
                    }
                  : {}),
              },
              orderBy: {
                date: 'asc',
              },
            },
          },
        },
      },
    });

    const goalsData = programs.map((program) => {
      const goalsWithStats = program.customGoals.map((goal) => {
        const totalDays = goal.completions.length;
        const completedDays = goal.completions.filter((c) => c.completed).length;
        const completionRate =
          totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

        return {
          goalId: goal.id,
          goalTitle: goal.title,
          goalDescription: goal.description,
          totalDays,
          completedDays,
          completionRate: Math.round(completionRate),
          completions: goal.completions,
        };
      });

      return {
        clientId: program.clientId,
        clientName: `${program.client.user.firstName} ${program.client.user.lastName}`,
        programTitle: program.title,
        goals: goalsWithStats,
      };
    });

    sendSuccess(res, goalsData);
  } catch (error) {
    console.error('Get goals completion error:', error);
    sendError(res, 'Erreur lors de la récupération des objectifs', 500);
  }
};
