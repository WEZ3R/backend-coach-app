import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createUser() {
  try {
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        email: 'marcyrius98@gmail.com',
        password: hashedPassword,
        role: 'COACH',
        firstName: 'Marc',
        lastName: 'Yrius',
        coachProfile: {
          create: {
            bio: 'Coach professionnel de fitness',
            experience: '5 ans d\'expérience'
          }
        }
      },
      include: {
        coachProfile: true
      }
    });

    console.log('✅ Utilisateur créé avec succès !');
    console.log('📧 Email:', user.email);
    console.log('🔑 Mot de passe: 123456');
    console.log('👤 Rôle:', user.role);
    console.log('👨 Nom:', user.firstName, user.lastName);

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.code === 'P2002') {
      console.log('⚠️  Cet email existe déjà');
    }
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
