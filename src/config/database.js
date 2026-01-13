import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Charger les variables d'environnement avant de créer l'instance Prisma
dotenv.config();

// Instance unique de Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coaching_app'
    }
  }
});

// Gestion de la connexion (lazy connection - se connecte au premier appel)
// Pas besoin de $connect() explicite, Prisma se connecte automatiquement
console.log('⏳ Database client initialized (connection will be established on first query)');

// Gestion de la déconnexion propre
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
