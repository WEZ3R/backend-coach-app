import prisma from '../config/database.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import rrulePkg from 'rrule';
const { RRule } = rrulePkg;

// Vérifie qu'aucun appointment CONFIRMED ne chevauche pour le coach (ou le client si présent)
const checkConflict = async (coachId, clientId, startAt, endAt, excludeId = null) => {
  const conditions = [{ coachId }];
  if (clientId) conditions.push({ clientId });

  const conflict = await prisma.appointment.findFirst({
    where: {
      status: 'CONFIRMED',
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: conditions,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });

  return conflict;
};

// POST /api/appointments — COACH ou CLIENT
export const createAppointment = async (req, res) => {
  try {
    const {
      title, clientId, coachId, startAt,
      durationMinutes: durationParam, locationType, locationDetail, meetingType, rrule,
      resolution, conflictId,  // gestion des conflits
    } = req.body;

    const isCoach = req.user.role === 'COACH';

    let coachProfile;
    let resolvedClientId = clientId;

    if (isCoach) {
      coachProfile = await prisma.coachProfile.findUnique({
        where: { userId: req.user.id },
      });
      if (!coachProfile) return sendError(res, 'Profil coach introuvable', 404);
    } else {
      if (rrule) return sendError(res, 'Les clients ne peuvent pas créer de RDV récurrents', 403);
      if (!coachId) return sendError(res, 'Le coachId est requis', 400);

      const clientProfile = await prisma.clientProfile.findUnique({
        where: { userId: req.user.id },
        select: { id: true },
      });
      if (!clientProfile) return sendError(res, 'Profil client introuvable', 404);

      coachProfile = await prisma.coachProfile.findUnique({
        where: { id: coachId },
      });
      if (!coachProfile) return sendError(res, 'Coach introuvable', 404);

      const block = await prisma.coachClientBlock.findUnique({
        where: { coachId_clientId: { coachId, clientId: clientProfile.id } },
      });
      if (block && (!block.blockedUntil || new Date(block.blockedUntil) > new Date())) {
        return sendError(res, 'Vous ne pouvez pas proposer de RDV à ce coach pour le moment', 403);
      }

      resolvedClientId = clientProfile.id;
    }

    if (!title) return sendError(res, 'Le titre est requis', 400);
    if (!startAt) return sendError(res, 'La date de début est requise', 400);
    if (!durationParam) return sendError(res, 'La durée est requise', 400);
    if (!locationType) return sendError(res, 'Le type de lieu est requis', 400);

    const startDate = new Date(startAt);
    let durationMinutes = durationParam;
    let endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    const status = resolvedClientId ? 'PROPOSED' : 'CONFIRMED';
    const isSentByCoach = isCoach;

    // Vérification de conflit coach — toujours active (un slot bloqué empêche les propositions)
    const conflict = await checkConflict(coachProfile.id, null, startDate, endDate);

    if (conflict && !resolution) {
      // Retourner les détails du conflit pour que le frontend propose des options
      return res.status(409).json({
        success: false,
        message: 'Conflit de planning détecté sur ce créneau.',
        conflict: {
          id: conflict.id,
          title: conflict.title,
          startAt: conflict.startAt,
          endAt: conflict.endAt,
          durationMinutes: conflict.durationMinutes,
        },
      });
    }

    if (conflict && resolution) {
      // Récupérer le RDV en conflit (utiliser conflictId si fourni, sinon celui détecté)
      const targetId = conflictId || conflict.id;
      const target = await prisma.appointment.findUnique({ where: { id: targetId } });
      if (!target) return sendError(res, 'RDV en conflit introuvable', 404);

      if (resolution === 'replace') {
        // Supprimer les enfants de série si applicable, puis le RDV lui-même
        if (target.rrule) {
          await prisma.appointment.deleteMany({ where: { parentId: target.id } });
        }
        await prisma.appointment.delete({ where: { id: target.id } });

      } else if (resolution === 'shorten') {
        if (target.startAt < startDate) {
          // L'existant démarre avant le nouveau → raccourcir l'existant
          const newDur = Math.max(1, Math.round((startDate.getTime() - target.startAt.getTime()) / 60000));
          await prisma.appointment.update({
            where: { id: target.id },
            data: { endAt: startDate, durationMinutes: newDur },
          });
        } else {
          // Le nouveau démarre avant l'existant → raccourcir le nouveau
          endDate = new Date(target.startAt.getTime());
          durationMinutes = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
        }
      }
    }

    if (rrule) {
      // Création d'une série récurrente (COACH uniquement, déjà vérifié)
      const parent = await prisma.appointment.create({
        data: {
          title,
          coachId: coachProfile.id,
          ...(resolvedClientId ? { clientId: resolvedClientId } : {}),
          startAt: startDate,
          endAt: endDate,
          durationMinutes,
          locationType,
          ...(locationDetail ? { locationDetail } : {}),
          ...(meetingType ? { meetingType } : {}),
          status,
          rrule,
        },
      });

      // Générer les occurrences via rrule, limitées à 1 an
      const rruleStr = rrule.startsWith('RRULE:') ? rrule.slice(6) : rrule;
      const rule = new RRule({ ...RRule.parseString(rruleStr), dtstart: startDate });
      const oneYearLater = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
      const dates = rule.all((date) => date <= oneYearLater);

      if (dates.length > 0) {
        await prisma.appointment.createMany({
          data: dates.map((date) => ({
            title,
            coachId: coachProfile.id,
            ...(resolvedClientId ? { clientId: resolvedClientId } : {}),
            startAt: date,
            endAt: new Date(date.getTime() + durationMinutes * 60000),
            durationMinutes,
            locationType,
            ...(locationDetail ? { locationDetail } : {}),
            ...(meetingType ? { meetingType } : {}),
            status,
            parentId: parent.id,
          })),
        });
      }

      // Créer le message de proposition si clientId présent
      let message = null;
      if (resolvedClientId) {
        message = await prisma.message.create({
          data: {
            coachId: coachProfile.id,
            clientId: resolvedClientId,
            content: `Nouvelle proposition de RDV : « ${title} » le ${startDate.toLocaleDateString('fr-FR')}.`,
            type: 'APPOINTMENT_PROPOSAL',
            isSentByCoach,
            appointmentId: parent.id,
          },
        });
      }

      const children = await prisma.appointment.findMany({
        where: { parentId: parent.id },
      });

      return sendSuccess(res, { appointment: parent, children, message }, 'Série de RDV créée', 201);
    }

    // Création d'un RDV ponctuel
    const appointment = await prisma.appointment.create({
      data: {
        title,
        coachId: coachProfile.id,
        ...(resolvedClientId ? { clientId: resolvedClientId } : {}),
        startAt: startDate,
        endAt: endDate,
        durationMinutes,
        locationType,
        ...(locationDetail ? { locationDetail } : {}),
        ...(meetingType ? { meetingType } : {}),
        status,
      },
    });

    // Créer le message de proposition si clientId présent
    let message = null;
    if (resolvedClientId) {
      message = await prisma.message.create({
        data: {
          coachId: coachProfile.id,
          clientId: resolvedClientId,
          content: `Nouvelle proposition de RDV : « ${title} » le ${startDate.toLocaleDateString('fr-FR')}.`,
          type: 'APPOINTMENT_PROPOSAL',
          isSentByCoach,
          appointmentId: appointment.id,
        },
      });
    }

    sendSuccess(res, { appointment, message }, 'RDV créé', 201);
  } catch (error) {
    console.error('createAppointment error:', error);
    sendError(res, 'Échec de la création du RDV', 500);
  }
};

// GET /api/appointments — authentifié
export const getAppointments = async (req, res) => {
  try {
    const { status, from, to } = req.query;

    let profileId;
    let roleFilter;

    if (req.user.role === 'COACH') {
      const coachProfile = await prisma.coachProfile.findUnique({ where: { userId: req.user.id } });
      if (!coachProfile) return sendError(res, 'Profil coach introuvable', 404);
      profileId = coachProfile.id;
      roleFilter = { coachId: profileId };
    } else {
      const clientProfile = await prisma.clientProfile.findUnique({ where: { userId: req.user.id } });
      if (!clientProfile) return sendError(res, 'Profil client introuvable', 404);
      profileId = clientProfile.id;
      roleFilter = { clientId: profileId };
    }

    const where = {
      ...roleFilter,
      // Exclure les parents de série (retourner les occurrences individuelles et les ponctuels)
      OR: [
        { parentId: null, rrule: null },  // ponctuels
        { parentId: { not: null } },       // occurrences enfants
      ],
      ...(status ? { status } : {}),
      ...(from || to ? {
        startAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
    };

    const include = req.user.role === 'COACH'
      ? { client: { include: { user: true } } }
      : { coach: { include: { user: true } } };

    const appointments = await prisma.appointment.findMany({
      where,
      include,
      orderBy: { startAt: 'asc' },
    });

    sendSuccess(res, appointments, 'RDV récupérés');
  } catch (error) {
    console.error('getAppointments error:', error);
    sendError(res, 'Échec de la récupération des RDV', 500);
  }
};

// GET /api/appointments/upcoming — authentifié
export const getUpcomingAppointments = async (req, res) => {
  try {
    let roleFilter;

    if (req.user.role === 'COACH') {
      const coachProfile = await prisma.coachProfile.findUnique({ where: { userId: req.user.id } });
      if (!coachProfile) return sendError(res, 'Profil coach introuvable', 404);
      roleFilter = { coachId: coachProfile.id };
    } else {
      const clientProfile = await prisma.clientProfile.findUnique({ where: { userId: req.user.id } });
      if (!clientProfile) return sendError(res, 'Profil client introuvable', 404);
      roleFilter = { clientId: clientProfile.id };
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        ...roleFilter,
        startAt: { gte: new Date() },
        status: { not: 'CANCELLED' },
      },
      include: {
        coach: { include: { user: true } },
        client: { include: { user: true } },
      },
      orderBy: { startAt: 'asc' },
      take: 3,
    });

    sendSuccess(res, appointments, 'Prochains RDV récupérés');
  } catch (error) {
    console.error('getUpcomingAppointments error:', error);
    sendError(res, 'Échec de la récupération des prochains RDV', 500);
  }
};

// GET /api/appointments/:id — authentifié
export const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        coach: { include: { user: true } },
        client: { include: { user: true } },
        message: true,
      },
    });

    if (!appointment) return sendError(res, 'RDV introuvable', 404);

    // Vérifier que l'utilisateur est le coach ou le client du RDV
    let isAuthorized = false;
    if (req.user.role === 'COACH') {
      const coachProfile = await prisma.coachProfile.findUnique({ where: { userId: req.user.id } });
      isAuthorized = coachProfile && appointment.coachId === coachProfile.id;
    } else {
      const clientProfile = await prisma.clientProfile.findUnique({ where: { userId: req.user.id } });
      isAuthorized = clientProfile && appointment.clientId === clientProfile.id;
    }

    if (!isAuthorized) return sendError(res, 'Accès non autorisé', 403);

    sendSuccess(res, appointment, 'RDV récupéré');
  } catch (error) {
    console.error('getAppointmentById error:', error);
    sendError(res, 'Échec de la récupération du RDV', 500);
  }
};

// PUT /api/appointments/:id/confirm — CLIENT uniquement
export const confirmAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const clientProfile = await prisma.clientProfile.findUnique({ where: { userId: req.user.id } });
    if (!clientProfile) return sendError(res, 'Profil client introuvable', 404);

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return sendError(res, 'RDV introuvable', 404);

    // Vérifier que le client est bien celui du RDV
    if (appointment.clientId !== clientProfile.id) return sendError(res, 'Accès non autorisé', 403);

    // Vérifier que le statut est PROPOSED
    if (appointment.status !== 'PROPOSED') return sendError(res, 'Ce RDV ne peut pas être confirmé', 400);

    // Vérifier les conflits
    const conflict = await checkConflict(
      appointment.coachId,
      clientProfile.id,
      appointment.startAt,
      appointment.endAt,
      id,
    );
    if (conflict) return sendError(res, 'Conflit de planning : un RDV existe déjà sur ce créneau', 409);

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });

    sendSuccess(res, updated, 'RDV confirmé');
  } catch (error) {
    console.error('confirmAppointment error:', error);
    sendError(res, 'Échec de la confirmation du RDV', 500);
  }
};

// PUT /api/appointments/:id/cancel — authentifié
export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const scope = req.query.scope || 'single';

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return sendError(res, 'RDV introuvable', 404);

    // Vérifier que l'utilisateur est le coach ou le client du RDV
    let isCoach = false;
    let isClient = false;
    let clientProfile = null;

    if (req.user.role === 'COACH') {
      const coachProfile = await prisma.coachProfile.findUnique({ where: { userId: req.user.id } });
      isCoach = coachProfile && appointment.coachId === coachProfile.id;
    } else {
      clientProfile = await prisma.clientProfile.findUnique({ where: { userId: req.user.id } });
      isClient = clientProfile && appointment.clientId === clientProfile.id;
    }

    if (!isCoach && !isClient) return sendError(res, 'Accès non autorisé', 403);

    // Annuler le RDV
    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Annuler les enfants si scope=series
    if (scope === 'series') {
      await prisma.appointment.updateMany({
        where: { parentId: id },
        data: { status: 'CANCELLED' },
      });
    }

    // Si annulation par le client → message TIP pour le coach
    if (isClient && appointment.clientId) {
      const dateStr = appointment.startAt.toLocaleDateString('fr-FR');
      const clientUser = await prisma.user.findUnique({ where: { id: req.user.id } });
      const prenom = clientUser?.firstName || 'Le client';

      await prisma.message.create({
        data: {
          coachId: appointment.coachId,
          clientId: appointment.clientId,
          content: `${prenom} a annulé le RDV « ${appointment.title} » prévu le ${dateStr}.`,
          type: 'TIP',
          isSentByCoach: false,
        },
      });
    }

    // Si annulation par le coach d'un RDV CONFIRMED avec client → notification client
    if (isCoach && appointment.clientId && appointment.status === 'CONFIRMED') {
      const clientProfileForNotif = await prisma.clientProfile.findUnique({
        where: { id: appointment.clientId },
        select: { userId: true },
      });
      if (clientProfileForNotif) {
        const dateStr = appointment.startAt.toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long',
        });
        await prisma.notification.create({
          data: {
            userId: clientProfileForNotif.userId,
            type: 'APPOINTMENT_CANCELLED',
            title: 'RDV annulé',
            body: `Votre RDV « ${appointment.title} » prévu le ${dateStr} a été annulé par votre coach.`,
            data: { appointmentId: appointment.id, title: appointment.title, startAt: appointment.startAt },
          },
        });
      }
    }

    sendSuccess(res, updated, 'RDV annulé');
  } catch (error) {
    console.error('cancelAppointment error:', error);
    sendError(res, "Échec de l'annulation du RDV", 500);
  }
};

// PUT /api/appointments/:id — COACH uniquement (modification)
export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, startAt, durationMinutes, locationType, locationDetail } = req.body;

    const coachProfile = await prisma.coachProfile.findUnique({ where: { userId: req.user.id } });
    if (!coachProfile) return sendError(res, 'Profil coach introuvable', 404);

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return sendError(res, 'RDV introuvable', 404);
    if (appointment.coachId !== coachProfile.id) return sendError(res, 'Accès non autorisé', 403);

    const newStart = startAt ? new Date(startAt) : appointment.startAt;
    const newDuration = durationMinutes ?? appointment.durationMinutes;
    const newEnd = new Date(newStart.getTime() + newDuration * 60000);

    // Construire la liste des changements pour la notification
    const changes = [];
    if (title && title !== appointment.title) {
      changes.push(`Titre : « ${appointment.title} » → « ${title} »`);
    }
    if (startAt && newStart.getTime() !== appointment.startAt.getTime()) {
      const oldDate = appointment.startAt.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      const newDate = newStart.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      changes.push(`Date : ${oldDate} → ${newDate}`);
    }
    if (durationMinutes && durationMinutes !== appointment.durationMinutes) {
      changes.push(`Durée : ${appointment.durationMinutes} min → ${durationMinutes} min`);
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(title ? { title } : {}),
        startAt: newStart,
        endAt: newEnd,
        durationMinutes: newDuration,
        ...(locationType ? { locationType } : {}),
        ...(locationDetail !== undefined ? { locationDetail } : {}),
      },
      include: {
        coach: { include: { user: true } },
        client: { include: { user: true } },
      },
    });

    // Notification client si RDV CONFIRMED avec client et changements réels
    if (appointment.clientId && appointment.status === 'CONFIRMED' && changes.length > 0) {
      const clientProfileForNotif = await prisma.clientProfile.findUnique({
        where: { id: appointment.clientId },
        select: { userId: true },
      });
      if (clientProfileForNotif) {
        await prisma.notification.create({
          data: {
            userId: clientProfileForNotif.userId,
            type: 'APPOINTMENT_MODIFIED',
            title: 'RDV modifié',
            body: `Votre RDV « ${updated.title} » a été modifié. ${changes.join(' | ')}`,
            data: { appointmentId: id, changes },
          },
        });
      }
    }

    sendSuccess(res, updated, 'RDV mis à jour');
  } catch (error) {
    console.error('updateAppointment error:', error);
    sendError(res, 'Échec de la mise à jour du RDV', 500);
  }
};

// DELETE /api/appointments/:id — COACH uniquement
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const scope = req.query.scope || 'single';

    const coachProfile = await prisma.coachProfile.findUnique({ where: { userId: req.user.id } });
    if (!coachProfile) return sendError(res, 'Profil coach introuvable', 404);

    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return sendError(res, 'RDV introuvable', 404);

    if (appointment.coachId !== coachProfile.id) return sendError(res, 'Accès non autorisé', 403);

    // Notification client si RDV avec client (quel que soit le statut)
    if (appointment.clientId) {
      const clientProfileForNotif = await prisma.clientProfile.findUnique({
        where: { id: appointment.clientId },
        select: { userId: true },
      });
      if (clientProfileForNotif) {
        const dateStr = appointment.startAt.toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
        });
        await prisma.notification.create({
          data: {
            userId: clientProfileForNotif.userId,
            type: 'APPOINTMENT_CANCELLED',
            title: 'RDV annulé',
            body: `Votre RDV « ${appointment.title} » prévu le ${dateStr} a été annulé par votre coach.`,
            data: { appointmentId: appointment.id, title: appointment.title, startAt: appointment.startAt },
          },
        });
      }
    }

    if (scope === 'series') {
      await prisma.appointment.deleteMany({ where: { parentId: id } });
    }

    await prisma.appointment.delete({ where: { id } });

    sendSuccess(res, null, 'RDV supprimé');
  } catch (error) {
    console.error('deleteAppointment error:', error);
    sendError(res, 'Échec de la suppression du RDV', 500);
  }
};
