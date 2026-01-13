import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('📅 Adding sessions for December 2025...\n');

    // Trouver le programme actif
    const activeProgram = await prisma.program.findFirst({
      where: {
        isActive: true,
      },
    });

    if (!activeProgram) {
      console.log('❌ No active program found');
      return;
    }

    console.log('✅ Found active program:', activeProgram.id);
    console.log('   Title:', activeProgram.title);
    console.log('   Client ID:', activeProgram.clientId);

    // Définir les exercices types pour les séances
    const exercises = [
      // Warmup
      {
        name: 'Échauffement cardio',
        category: 'WARMUP',
        sets: 1,
        reps: '10',
        restTime: '60s',
        description: 'Échauffement général',
        order: 1,
      },
      // Main exercises
      {
        name: 'Squat',
        category: 'MAIN',
        sets: 4,
        reps: '10',
        weight: '80',
        restTime: '2min',
        description: 'Garder le dos droit',
        order: 2,
      },
      {
        name: 'Développé couché',
        category: 'MAIN',
        sets: 4,
        reps: '8',
        weight: '60',
        restTime: '2min',
        description: 'Contrôler la descente',
        order: 3,
      },
      {
        name: 'Rowing',
        category: 'MAIN',
        sets: 3,
        reps: '12',
        weight: '40',
        restTime: '90s',
        description: 'Bien tirer les coudes',
        order: 4,
      },
      // Cardio
      {
        name: 'Course',
        category: 'CARDIO',
        sets: 1,
        duration: '20min',
        restTime: '0s',
        description: '20 minutes de course modérée',
        order: 5,
      },
      // Stretching
      {
        name: 'Étirements complets',
        category: 'STRETCHING',
        sets: 1,
        duration: '10min',
        restTime: '30s',
        description: 'Étirer tous les groupes musculaires',
        order: 6,
      },
    ];

    let sessionsCreated = 0;
    let sessionsSkipped = 0;

    // Créer des séances pour chaque jour de décembre 2025
    for (let day = 1; day <= 31; day++) {
      const date = new Date(Date.UTC(2025, 11, day, 11, 0, 0)); // 11h UTC

      // Vérifier si la session existe déjà
      const existingSession = await prisma.session.findUnique({
        where: {
          programId_date: {
            programId: activeProgram.id,
            date: date,
          },
        },
      });

      if (existingSession) {
        console.log(`⏭️  Session already exists for ${day}/12/2025`);
        sessionsSkipped++;
        continue;
      }

      // Alterner entre séance d'entraînement et jour de repos
      const isRestDay = day % 4 === 0; // Jour de repos tous les 4 jours

      if (isRestDay) {
        // Créer une séance de repos
        await prisma.session.create({
          data: {
            programId: activeProgram.id,
            date: date,
            status: 'DRAFT',
            isRestDay: true,
            notes: 'Jour de repos - Profitez-en pour récupérer',
          },
        });
        console.log(`✅ Created rest day session for ${day}/12/2025`);
      } else {
        // Créer une séance d'entraînement avec exercices
        await prisma.session.create({
          data: {
            programId: activeProgram.id,
            date: date,
            status: 'DRAFT',
            isRestDay: false,
            notes: `Séance complète - Push your limits!`,
            exercises: {
              create: exercises,
            },
          },
        });
        console.log(`✅ Created training session for ${day}/12/2025`);
      }

      sessionsCreated++;
    }

    console.log('\n🎉 Done!');
    console.log(`   Created: ${sessionsCreated} sessions`);
    console.log(`   Skipped: ${sessionsSkipped} sessions (already existed)`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
