import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'marcyrius98@gmail.com' },
      include: {
        coachProfile: true,
        clientProfile: true
      }
    });

    if (user) {
      console.log('✅ User found:');
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Coach Profile:', user.coachProfile ? 'Yes' : 'No');
      console.log('Client Profile:', user.clientProfile ? 'Yes' : 'No');
    } else {
      console.log('❌ User not found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
