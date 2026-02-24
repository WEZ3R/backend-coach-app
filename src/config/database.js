import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Charger les variables d'environnement avant de créer l'instance Prisma
dotenv.config();

// Construction dynamique de l'URL à partir des variables individuelles
const {
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_USER = 'postgres',
  DB_PASSWORD = 'postgres',
  DB_NAME = 'coaching_app',
} = process.env;

const databaseUrl = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

// Instance unique de Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: databaseUrl
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
