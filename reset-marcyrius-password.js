import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const email = 'marcyrius98@gmail.com';
    const newPassword = '123456';

    // Hash le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mise à jour de l'utilisateur
    const user = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
      include: {
        clientProfile: true,
        coachProfile: true
      }
    });

    console.log('✅ Mot de passe réinitialisé avec succès pour:', email);
    console.log('📧 Email:', user.email);
    console.log('👤 Rôle:', user.role);
    console.log('🔑 Nouveau mot de passe: 123456');

    if (user.clientProfile) {
      console.log('👥 Client Profile ID:', user.clientProfile.id);
    }
    if (user.coachProfile) {
      console.log('💪 Coach Profile ID:', user.coachProfile.id);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
