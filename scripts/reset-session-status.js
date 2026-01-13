import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔄 Resetting session status for 2025-11-28...\n');

    // Trouver la session du 28 novembre 2025
    const targetDate = new Date('2025-11-28T11:00:00.000Z');

    const session = await prisma.session.findFirst({
      where: {
        date: targetDate,
      },
      include: {
        exercises: true,
      },
    });

    if (!session) {
      console.log('❌ Session not found for 2025-11-28');
      return;
    }

    console.log('✅ Found session:', session.id);
    console.log('Current status:', session.status);

    // Supprimer tous les SetCompletions pour cette session
    const exerciseIds = session.exercises.map(ex => ex.id);

    const deleteResult = await prisma.setCompletion.deleteMany({
      where: {
        exerciseId: {
          in: exerciseIds,
        },
      },
    });

    console.log(`🗑️  Deleted ${deleteResult.count} set completions`);

    // Mettre à jour le statut de la session en DRAFT
    const updatedSession = await prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        status: 'DRAFT',
      },
    });

    console.log('✅ Session status updated to:', updatedSession.status);
    console.log('\n🎉 Session reset successfully! You can now test entering data.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
