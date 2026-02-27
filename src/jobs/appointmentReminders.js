import cron from 'node-cron';
import prisma from '../config/database.js';

// Chaque jour à 8h00 — envoi des rappels de RDV dans les 24h
cron.schedule('0 8 * * *', async () => {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcoming = await prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        startAt: { gte: now, lte: in24h },
      },
      include: {
        coach: { include: { user: true } },
        client: { include: { user: true } },
      },
    });

    for (const appt of upcoming) {
      const dateStr = appt.startAt.toLocaleDateString('fr-FR');
      const content = `Rappel : RDV « ${appt.title} » demain ${dateStr}.`;

      // Message TIP au coach (si relation client existe pour Message)
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

    console.log(`[appointmentReminders] ${upcoming.length} rappel(s) envoyé(s).`);
  } catch (error) {
    console.error('[appointmentReminders] Erreur lors de l\'envoi des rappels:', error);
  }
});
