import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createClient4() {
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

    console.log(`✅ Coach trouvé: ${coach.firstName} ${coach.lastName}\n`);

    const hashedPassword = await bcrypt.hash('123456', 10);

    const client = await prisma.user.create({
      data: {
        email: 'client4@test.com',
        password: hashedPassword,
        role: 'CLIENT',
        firstName: 'Thomas',
        lastName: 'Lefebvre',
        clientProfile: {
          create: {
            coachId: coach.coachProfile.id,
            weight: 85.0,
            height: 188,
            goals: 'Développer ma force et mon endurance'
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

    console.log('✅ Client 4 créé avec succès !');
    console.log(`   📧 Email: ${client.email}`);
    console.log(`   👤 Nom: ${client.firstName} ${client.lastName}`);
    console.log(`   ⚖️  Poids: ${client.clientProfile.weight} kg`);
    console.log(`   📏 Taille: ${client.clientProfile.height} cm`);
    console.log(`   👨‍🏫 Coach: ${client.clientProfile.coach.user.firstName} ${client.clientProfile.coach.user.lastName}`);
    console.log(`   🔑 Mot de passe: 123456`);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code === 'P2002') {
      console.log('⚠️  Cet email existe déjà');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createClient4();
