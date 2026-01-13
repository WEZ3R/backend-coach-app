import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createClients() {
  try {
    // Trouver le coach
    const coach = await prisma.user.findUnique({
      where: { email: 'marcyrius98@gmail.com' },
      include: { coachProfile: true }
    });

    if (!coach || !coach.coachProfile) {
      console.error('❌ Coach non trouvé');
      return;
    }

    console.log(`✅ Coach trouvé: ${coach.firstName} ${coach.lastName}`);
    console.log(`🆔 Coach Profile ID: ${coach.coachProfile.id}\n`);

    const clients = [
      {
        email: 'client1@test.com',
        password: '123456',
        firstName: 'Jean',
        lastName: 'Dupont',
        weight: 75.5,
        height: 178,
        goals: 'Perdre du poids et gagner en masse musculaire'
      },
      {
        email: 'client2@test.com',
        password: '123456',
        firstName: 'Marie',
        lastName: 'Martin',
        weight: 62.0,
        height: 165,
        goals: 'Améliorer ma condition physique générale'
      },
      {
        email: 'client3@test.com',
        password: '123456',
        firstName: 'Pierre',
        lastName: 'Durand',
        weight: 82.0,
        height: 182,
        goals: 'Prendre de la masse musculaire'
      }
    ];

    console.log('🔄 Création des clients...\n');

    for (const clientData of clients) {
      const hashedPassword = await bcrypt.hash(clientData.password, 10);

      const client = await prisma.user.create({
        data: {
          email: clientData.email,
          password: hashedPassword,
          role: 'CLIENT',
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          clientProfile: {
            create: {
              coachId: coach.coachProfile.id,
              weight: clientData.weight,
              height: clientData.height,
              goals: clientData.goals
            }
          }
        },
        include: {
          clientProfile: {
            include: {
              coach: {
                include: {
                  user: true
                }
              }
            }
          }
        }
      });

      console.log('✅ Client créé:');
      console.log(`   📧 Email: ${client.email}`);
      console.log(`   👤 Nom: ${client.firstName} ${client.lastName}`);
      console.log(`   👨‍🏫 Coach: ${client.clientProfile.coach.user.firstName} ${client.clientProfile.coach.user.lastName}`);
      console.log(`   🔑 Mot de passe: 123456`);
      console.log('');
    }

    console.log('🎉 Tous les clients ont été créés avec succès !');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code === 'P2002') {
      console.log('⚠️  Un ou plusieurs emails existent déjà');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createClients();
