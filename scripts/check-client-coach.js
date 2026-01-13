import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking client-coach relationship...\n');

    // Trouver le coach
    const coach = await prisma.user.findUnique({
      where: { email: 'marcyrius98@gmail.com' },
      include: {
        coachProfile: {
          include: {
            clients: true,
          }
        }
      },
    });

    console.log('Coach:', coach.email);
    console.log('Coach Profile ID:', coach.coachProfile.id);
    console.log('Number of clients:', coach.coachProfile.clients.length);

    if (coach.coachProfile.clients.length > 0) {
      console.log('\nClients:');
      coach.coachProfile.clients.forEach(client => {
        console.log('  -', client.id, client.userId);
      });
    }

    // Trouver le client
    const client = await prisma.user.findUnique({
      where: { email: 'client4@test.com' },
      include: {
        clientProfile: true
      },
    });

    console.log('\nClient:', client.email);
    console.log('Client User ID:', client.id);
    console.log('Client Profile ID:', client.clientProfile.id);
    console.log('Client Profile CoachId:', client.clientProfile.coachId);

    // Vérifier si le client est lié au coach
    const isLinked = client.clientProfile.coachId === coach.coachProfile.id;
    console.log('\nIs client linked to coach?', isLinked);

    // Chercher les programmes
    const programs = await prisma.program.findMany({
      where: {
        clientId: client.id,
      },
    });

    console.log('\nPrograms for client (by User ID):', programs.length);
    programs.forEach(p => {
      console.log('  -', p.title, '| Coach:', p.coachId, '| Client:', p.clientId);
    });

    // Vérifier les coach requests
    const requests = await prisma.coachRequest.findMany({
      where: {
        OR: [
          { coachId: coach.coachProfile.id },
          { clientId: client.clientProfile.id },
        ]
      }
    });

    console.log('\nCoach Requests:', requests.length);
    requests.forEach(req => {
      console.log('  - Coach:', req.coachId, '| Client:', req.clientId, '| Status:', req.status);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
