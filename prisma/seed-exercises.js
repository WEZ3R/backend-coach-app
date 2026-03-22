/**
 * Script de seed pour le référentiel d'exercices (bootstrapping-lab/exercisedb-api)
 *
 * Source gratuite, 1500 exercices avec vrais GIFs animés.
 * Format source : { exerciseId, name, gifUrl, targetMuscles[], bodyParts[], equipments[], secondaryMuscles[], instructions[] }
 *
 * Usage : node prisma/seed-exercises.js
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
  process.env.DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

const prisma = new PrismaClient();

const SOURCE_URL = 'https://raw.githubusercontent.com/bootstrapping-lab/exercisedb-api/main/src/data/exercises.json';

// bodyParts → valeurs normalisées
const normalizeBodyParts = (parts = []) => {
  const map = {
    'back':         'BACK',
    'cardio':       'CARDIO',
    'chest':        'CHEST',
    'lower arms':   'LOWER_ARMS',
    'lower legs':   'LOWER_LEGS',
    'neck':         'NECK',
    'shoulders':    'SHOULDERS',
    'upper arms':   'UPPER_ARMS',
    'upper legs':   'UPPER_LEGS',
    'waist':        'WAIST',
  };
  return parts.map(p => map[p?.toLowerCase()] || 'OTHER');
};

// equipments → valeurs normalisées
const normalizeEquipments = (equips = []) => {
  const map = {
    'barbell':          'BARBELL',
    'dumbbell':         'DUMBBELL',
    'body weight':      'BODYWEIGHT',
    'cable':            'CABLE',
    'machine':          'MACHINE',
    'band':             'BAND',
    'kettlebell':       'KETTLEBELL',
    'medicine ball':    'MEDICINE_BALL',
    'stability ball':   'STABILITY_BALL',
    'ez barbell':       'EZ_BARBELL',
    'roller':           'ROLLER',
    'smith machine':    'SMITH_MACHINE',
    'assisted':         'MACHINE',
    'leverage machine': 'MACHINE',
    'olympic barbell':  'BARBELL',
    'trap bar':         'BARBELL',
  };
  return equips.map(e => map[e?.toLowerCase()] || e?.toUpperCase().replace(/\s+/g, '_') || 'OTHER');
};

// bodyParts → exerciseType
const mapExerciseType = (parts = []) => {
  if (parts.some(p => p?.toLowerCase() === 'cardio')) return 'CARDIO';
  return 'STRENGTH';
};

async function seed() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🏋️  ExerciseDB Seed (GIFs gratuits) – démarrage');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📡 Téléchargement du dataset (1500 exercices)...');
  const response = await fetch(SOURCE_URL);
  if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);

  const exercises = await response.json();
  console.log(`✅ ${exercises.length} exercices récupérés\n`);

  const existingCount = await prisma.exerciseReference.count();
  console.log(`📦 ${existingCount} exercices actuellement en base`);
  console.log('🔄 Mise à jour en cours...\n');

  let inserted = 0;
  let skipped = 0;

  for (const ex of exercises) {
    const data = {
      name:             ex.name,
      bodyParts:        normalizeBodyParts(ex.bodyParts),
      targetMuscles:    ex.targetMuscles || [],
      secondaryMuscles: ex.secondaryMuscles || [],
      equipments:       normalizeEquipments(ex.equipments),
      exerciseType:     mapExerciseType(ex.bodyParts),
      gifUrl:           ex.gifUrl || null,
      instructions:     ex.instructions || [],
    };

    try {
      await prisma.exerciseReference.upsert({
        where:  { exerciseDbId: ex.exerciseId },
        update: data,
        create: { exerciseDbId: ex.exerciseId, ...data },
      });
      inserted++;
    } catch (error) {
      console.error(`  ❌ ${ex.name} (${ex.exerciseId}) :`, error.message);
      skipped++;
    }

    if ((inserted + skipped) % 100 === 0) {
      process.stdout.write(`  ${inserted + skipped}/${exercises.length}...\r`);
    }
  }

  const total = await prisma.exerciseReference.count();
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅  Seed terminé !');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  • ${inserted} exercices insérés/mis à jour`);
  console.log(`  • ${skipped} erreurs`);
  console.log(`  • ${total} exercices en base\n`);
}

seed()
  .catch((error) => {
    console.error('\n❌ Erreur :', error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
