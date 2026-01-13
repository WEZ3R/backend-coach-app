import { PrismaClient } from '@prisma/client';

// Set DATABASE_URL directly
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/coaching_app';

console.log('DATABASE_URL:', process.env.DATABASE_URL);

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5432/coaching_app'
    }
  }
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Connection successful!', result);
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
