import cron from 'node-cron';
import prisma from '../config/database.js';

// Chaque jour à 8h00 — envoi des rappels J-1 (TIP dans la conversation)
cron.schedule('0 8 * * *', async () => {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcoming = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        startAt: { gte: now, lte: in24h },
      },
    });

    for (const appt of upcoming) {
      const dateStr = appt.startAt.toLocaleDateString('fr-FR');
      const content = `Rappel : RDV « ${appt.title} » demain ${dateStr}.`;

      if (appt.clientId) {
        await prisma.message.create({
          data: {
            coachId: appt.coachId,
            clientId: appt.clientId,
            content,
            type: 'TIP',
            isSentByCoach: true,
          },
        });
      }
    }

    console.log(`[appointmentReminders] ${upcoming.length} rappel(s) J-1 envoyé(s).`);
  } catch (error) {
    console.error('[appointmentReminders] Erreur rappels J-1:', error);
  }
});

// Toutes les 5 minutes — rappel 1h avant le RDV (Notification cloche pour coach + client)
cron.schedule('*/5 * * * *', async () => {
  try {
    const now = new Date();
    // Fenêtre [now+55min, now+65min] pour capter les RDV qui démarrent dans ~1h,
    // avec une marge pour ne rien rater entre deux exécutions.
    const windowStart = new Date(now.getTime() + 55 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 65 * 60 * 1000);

    const due = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        reminderSentAt: null,
        startAt: { gte: windowStart, lte: windowEnd },
      },
      include: {
        coach: { include: { user: true } },
        client: { include: { user: true } },
      },
    });

    for (const appt of due) {
      const timeStr = appt.startAt.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const data = {
        appointmentId: appt.id,
        startAt: appt.startAt.toISOString(),
        durationMinutes: appt.durationMinutes,
        locationType: appt.locationType,
        locationDetail: appt.locationDetail,
      };

      const recipients = [];
      if (appt.coach?.user?.id) {
        const otherName = appt.client?.user
          ? `${appt.client.user.firstName} ${appt.client.user.lastName}`
          : 'votre client';
        recipients.push({
          userId: appt.coach.user.id,
          title: 'RDV dans 1 heure',
          body: `« ${appt.title} » à ${timeStr} avec ${otherName}.`,
        });
      }
      if (appt.client?.user?.id) {
        const otherName = appt.coach?.user
          ? `${appt.coach.user.firstName} ${appt.coach.user.lastName}`
          : 'votre coach';
        recipients.push({
          userId: appt.client.user.id,
          title: 'RDV dans 1 heure',
          body: `« ${appt.title} » à ${timeStr} avec ${otherName}.`,
        });
      }

      if (recipients.length > 0) {
        await prisma.notification.createMany({
          data: recipients.map((r) => ({
            userId: r.userId,
            type: 'APPOINTMENT_REMINDER',
            title: r.title,
            body: r.body,
            data,
          })),
        });
      }

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date() },
      });
    }

    if (due.length > 0) {
      console.log(`[appointmentReminders] ${due.length} rappel(s) H-1 envoyé(s).`);
    }
  } catch (error) {
    console.error('[appointmentReminders] Erreur rappels H-1:', error);
  }
});
