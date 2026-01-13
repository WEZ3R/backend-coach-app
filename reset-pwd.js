import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    const password = '123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Hashed password:', hashedPassword);

    const user = await prisma.user.update({
      where: { email: 'marcyrius98@gmail.com' },
      data: { password: hashedPassword }
    });

    console.log('✅ Password updated successfully!');
    console.log('Email:', user.email);
    console.log('New password: 123456');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
