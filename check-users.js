import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    // Récupérer tous les utilisateurs
    const users = await prisma.user.findMany({
      include: {
        coachProfile: true,
        clientProfile: {
          include: {
            coach: {
              include: {
                user: {
                  select: {
                    email: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log('\n📊 ÉTAT DE LA BASE DE DONNÉES\n');
    console.log(`Total utilisateurs: ${users.length}\n`);

    users.forEach(user => {
      console.log('─────────────────────────────');
      console.log(`📧 Email: ${user.email}`);
      console.log(`👤 Nom: ${user.firstName} ${user.lastName}`);
      console.log(`🎭 Rôle: ${user.role}`);

      if (user.role === 'COACH') {
        console.log(`✅ Profil coach: ${user.coachProfile ? 'Oui' : 'Non'}`);
      } else if (user.role === 'CLIENT') {
        console.log(`✅ Profil client: ${user.clientProfile ? 'Oui' : 'Non'}`);
        if (user.clientProfile) {
          if (user.clientProfile.coachId) {
            console.log(`👨‍🏫 Coach assigné: ${user.clientProfile.coach.user.firstName} ${user.clientProfile.coach.user.lastName} (${user.clientProfile.coach.user.email})`);
          } else {
            console.log(`⚠️  Aucun coach assigné`);
          }
        }
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
