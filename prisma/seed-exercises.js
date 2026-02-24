/**
 * Script de seed pour le référentiel d'exercices (free-exercise-db)
 *
 * Télécharge le dataset depuis GitHub et insère dans la table exercise_references.
 *
 * Format source : { name, force, level, mechanic, equipment, primaryMuscles[], secondaryMuscles[], instructions[], category, images[], id }
 *
 * Usage : node prisma/seed-exercises.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXERCISEDB_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

// Mapping primaryMuscle → bodyPart normalisé
const muscleToBodyPart = (muscles) => {
  const map = {
    'abdominals': 'WAIST',
    'abductors': 'UPPER_LEGS',
    'adductors': 'UPPER_LEGS',
    'biceps': 'UPPER_ARMS',
    'calves': 'LOWER_LEGS',
    'chest': 'CHEST',
    'forearms': 'LOWER_ARMS',
    'glutes': 'UPPER_LEGS',
    'hamstrings': 'UPPER_LEGS',
    'lats': 'BACK',
    'lower back': 'BACK',
    'middle back': 'BACK',
    'traps': 'BACK',
    'neck': 'NECK',
    'quadriceps': 'UPPER_LEGS',
    'shoulders': 'SHOULDERS',
    'triceps': 'UPPER_ARMS',
  };
  const parts = new Set();
  for (const m of muscles) {
    parts.add(map[m?.toLowerCase()] || 'OTHER');
  }
  return [...parts];
};

// Mapping equipment → valeur normalisée
const normalizeEquipment = (equipment) => {
  const map = {
    'barbell': 'BARBELL',
    'dumbbell': 'DUMBBELL',
    'body only': 'BODYWEIGHT',
    'cable': 'CABLE',
    'machine': 'MACHINE',
    'bands': 'BAND',
    'kettlebells': 'KETTLEBELL',
    'medicine ball': 'MEDICINE_BALL',
    'exercise ball': 'STABILITY_BALL',
    'e-z curl bar': 'EZ_BARBELL',
    'foam roll': 'ROLLER',
    'other': 'OTHER',
    'none': 'BODYWEIGHT',
  };
  return map[equipment?.toLowerCase()] || equipment?.toUpperCase().replace(/\s+/g, '_') || 'OTHER';
};

// Mapper category → exerciseType
const mapCategory = (category) => {
  const map = {
    'strength': 'STRENGTH',
    'stretching': 'STRETCHING',
    'plyometrics': 'PLYOMETRICS',
    'strongman': 'STRENGTH',
    'powerlifting': 'STRENGTH',
    'cardio': 'CARDIO',
    'olympic weightlifting': 'STRENGTH',
  };
  return map[category?.toLowerCase()] || 'STRENGTH';
};

async function seed() {
  console.log('Téléchargement du dataset free-exercise-db...');

  const response = await fetch(EXERCISEDB_URL);
  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status} lors du téléchargement`);
  }

  const exercises = await response.json();
  console.log(`${exercises.length} exercices trouvés dans le dataset`);

  const existingCount = await prisma.exerciseReference.count();
  console.log(`${existingCount} exercices déjà en base`);

  let inserted = 0;
  let skipped = 0;

  for (const ex of exercises) {
    const exerciseDbId = ex.id;
    const primaryMuscles = ex.primaryMuscles || [];
    const secondaryMuscles = ex.secondaryMuscles || [];

    // Construire l'URL du GIF depuis le repo GitHub
    const gifUrl = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${exerciseDbId}.gif`;

    const data = {
      name: ex.name,
      bodyParts: muscleToBodyPart(primaryMuscles),
      targetMuscles: primaryMuscles,
      secondaryMuscles: secondaryMuscles,
      equipments: [normalizeEquipment(ex.equipment)],
      exerciseType: mapCategory(ex.category),
      gifUrl,
      instructions: ex.instructions || [],
    };

    try {
      await prisma.exerciseReference.upsert({
        where: { exerciseDbId },
        update: data,
        create: { exerciseDbId, ...data },
      });
      inserted++;
    } catch (error) {
      console.error(`Erreur pour l'exercice ${ex.name} (${exerciseDbId}):`, error.message);
      skipped++;
    }

    if ((inserted + skipped) % 100 === 0) {
      console.log(`Progression: ${inserted} insérés, ${skipped} erreurs sur ${exercises.length}`);
    }
  }

  console.log(`\nSeed terminé !`);
  console.log(`  - ${inserted} exercices insérés/mis à jour`);
  console.log(`  - ${skipped} erreurs`);
  console.log(`  - Total en base: ${await prisma.exerciseReference.count()}`);
}

seed()
  .catch((error) => {
    console.error('Erreur lors du seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
