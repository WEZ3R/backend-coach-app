import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/bcrypt.js';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Checking existing users...');

    const users = await prisma.user.findMany({
      include: {
        clientProfile: true,
        coachProfile: true,
      },
    });

    console.log(`\nFound ${users.length} user(s):`);
    users.forEach(u => {
      console.log(`  - ${u.email} (${u.role})`);
    });

    if (users.length === 0) {
      console.log('\n📝 No users found. Creating test users...\n');

      // Create a client
      const hashedPassword = await hashPassword('password123');

      const client = await prisma.user.create({
        data: {
          email: 'client@test.com',
          password: hashedPassword,
          role: 'CLIENT',
          firstName: 'Test',
          lastName: 'Client',
          clientProfile: {
            create: {
              goals: 'Perte de poids',
              level: 'Débutant',
            },
          },
        },
      });
      console.log('✅ Created client: client@test.com / password123');

      // Create a coach
      const coach = await prisma.user.create({
        data: {
          email: 'coach@test.com',
          password: hashedPassword,
          role: 'COACH',
          firstName: 'Test',
          lastName: 'Coach',
          coachProfile: {
            create: {
              bio: 'Coach de test',
            },
          },
        },
      });
      console.log('✅ Created coach: coach@test.com / password123');
    } else {
      console.log('\n✅ Users already exist in database.');
      console.log('\nTo test login, use one of these credentials:');
      users.forEach(u => {
        console.log(`  - Email: ${u.email}`);
      });
      console.log('  - Password: (check your records or reset)');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
