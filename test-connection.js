import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Charger les variables d'environnement
dotenv.config();

console.log('DATABASE_URL:', process.env.DATABASE_URL);

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
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
