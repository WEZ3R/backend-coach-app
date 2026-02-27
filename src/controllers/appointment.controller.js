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

// POST /api/appointments — COACH uniquement
export const createAppointment = async (req, res) => {
  try {
    const { title, clientId, startAt, durationMinutes, locationType, locationDetail, rrule } = req.body;

    // Récupérer le profil coach
    const coachProfile = await prisma.coachProfile.findUnique({
      where: { userId: req.user.id },
    });
    if (!coachProfile) return sendError(res, 'Profil coach introuvable', 404);

    // Validation des champs requis
    if (!title) return sendError(res, 'Le titre est requis', 400);
    if (!startAt) return sendError(res, 'La date de début est requise', 400);
    if (!durationMinutes) return sendError(res, 'La durée est requise', 400);
    if (!locationType) return sendError(res, 'Le type de lieu est requis', 400);

    const startDate = new Date(startAt);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    // Statut selon présence du client
    const status = clientId ? 'PROPOSED' : 'CONFIRMED';

    // Vérification de conflit (uniquement si CONFIRMED)
    if (!clientId) {
      const conflict = await checkConflict(coachProfile.id, null, startDate, endDate);
      if (conflict) return sendError(res, 'Conflit de planning : un RDV existe déjà sur ce créneau', 409);
    }

    if (rrule) {
      // Création d'une série récurrente
      const parent = await prisma.appointment.create({
        data: {
          title,
          coachId: coachProfile.id,
          ...(clientId ? { clientId } : {}),
          startAt: startDate,
          endAt: endDate,
          durationMinutes,
          locationType,
          ...(locationDetail ? { locationDetail } : {}),
          status,
          rrule,
        },
      });

      // Générer les occurrences via rrule, limitées à 1 an
      // Extraire uniquement la partie RRULE (sans DTSTART) pour RRule.parseString
      const rruleStr = rrule.startsWith('RRULE:') ? rrule.slice(6) : rrule;
      const rule = new RRule({ ...RRule.parseString(rruleStr), dtstart: startDate });
      const oneYearLater = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);
      // all() respecte COUNT ; on filtre à 1 an
      const dates = rule.all((date) => date <= oneYearLater);

      // Créer les occurrences enfants
      if (dates.length > 0) {
        await prisma.appointment.createMany({
          data: dates.map((date) => ({
            title,
            coachId: coachProfile.id,
            ...(clientId ? { clientId } : {}),
            startAt: date,
            endAt: new Date(date.getTime() + durationMinutes * 60000),
            durationMinutes,
            locationType,
            ...(locationDetail ? { locationDetail } : {}),
            status,
            parentId: parent.id,
          })),
        });
      }

      // Créer le message de proposition si clientId présent
      let message = null;
      if (clientId) {
        message = await prisma.message.create({
          data: {
            coachId: coachProfile.id,
            clientId,
            content: `Nouvelle proposition de RDV : « ${title} » le ${startDate.toLocaleDateString('fr-FR')}.`,
            type: 'APPOINTMENT_PROPOSAL',
            isSentByCoach: true,
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
        ...(clientId ? { clientId } : {}),
        startAt: startDate,
        endAt: endDate,
        durationMinutes,
        locationType,
        ...(locationDetail ? { locationDetail } : {}),
        status,
      },
    });

    // Créer le message de proposition si clientId présent
    let message = null;
    if (clientId) {
      message = await prisma.message.create({
        data: {
          coachId: coachProfile.id,
          clientId,
          content: `Nouvelle proposition de RDV : « ${title} » le ${startDate.toLocaleDateString('fr-FR')}.`,
          type: 'APPOINTMENT_PROPOSAL',
          isSentByCoach: true,
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

    // Si annulation par le client et RDV avait un clientId → créer un message TIP pour le coach
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

    sendSuccess(res, updated, 'RDV annulé');
  } catch (error) {
    console.error('cancelAppointment error:', error);
    sendError(res, "Échec de l'annulation du RDV", 500);
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

    if (scope === 'series') {
      // Supprimer d'abord les enfants, puis le parent
      await prisma.appointment.deleteMany({ where: { parentId: id } });
    }

    await prisma.appointment.delete({ where: { id } });

    sendSuccess(res, null, 'RDV supprimé');
  } catch (error) {
    console.error('deleteAppointment error:', error);
    sendError(res, 'Échec de la suppression du RDV', 500);
  }
};
