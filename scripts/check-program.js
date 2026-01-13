import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking program data...\n');

    // Trouver le coach
    const coach = await prisma.user.findUnique({
      where: { email: 'marcyrius98@gmail.com' },
      include: { coachProfile: true },
    });

    console.log('Coach:', {
      id: coach.id,
      email: coach.email,
      coachProfileId: coach.coachProfile.id,
    });

    // Trouver le client
    const client = await prisma.user.findUnique({
      where: { email: 'client4@test.com' },
      include: { clientProfile: true },
    });

    console.log('\nClient:', {
      id: client.id,
      email: client.email,
      clientProfileId: client.clientProfile?.id,
    });

    // Chercher les programmes
    const programs = await prisma.program.findMany({
      include: {
        coach: {
          include: {
            user: true,
          },
        },
      },
    });

    console.log('\n📋 All programs in database:');
    programs.forEach((prog, index) => {
      console.log(`\nProgram ${index + 1}:`);
      console.log('  ID:', prog.id);
      console.log('  Title:', prog.title);
      console.log('  CoachId:', prog.coachId);
      console.log('  Coach email:', prog.coach?.user?.email);
      console.log('  ClientId:', prog.clientId);
      console.log('  Is Active:', prog.isActive);
    });

    // Chercher spécifiquement les programmes du coach
    const coachPrograms = await prisma.program.findMany({
      where: {
        coachId: coach.coachProfile.id,
      },
    });

    console.log(`\n✅ Programs for coach ${coach.email}:`, coachPrograms.length);
    coachPrograms.forEach(p => console.log('  -', p.title));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
