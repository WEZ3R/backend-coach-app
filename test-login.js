import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLogin() {
  try {
    const email = 'marcyrius98@gmail.com';
    const password = '123456';

    console.log('🔍 Testing login for:', email);
    console.log('🔑 Password:', password);
    console.log('');

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('❌ User not found in database');
      return;
    }

    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Password hash:', user.password);
    console.log('');

    // Tester la comparaison du mot de passe
    const isValid = await bcrypt.compare(password, user.password);

    console.log('🔐 Password verification:');
    console.log('   Password to test:', password);
    console.log('   Stored hash:', user.password);
    console.log('   Match:', isValid ? '✅ YES' : '❌ NO');

    if (isValid) {
      console.log('');
      console.log('✅ Login should work! The password is correct.');
    } else {
      console.log('');
      console.log('❌ Login will fail! The password does not match.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();
