import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Adding set completions for session on 2025-11-25...\n');

    // Trouver la session du 25 novembre 2025
    const targetDate = new Date('2025-11-25T11:00:00.000Z');

    const session = await prisma.session.findFirst({
      where: {
        date: targetDate,
      },
      include: {
        exercises: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!session) {
      console.log('❌ Session not found for 2025-11-25');
      return;
    }

    console.log('✅ Found session:', session.id);
    console.log('Exercises:', session.exercises.length);

    // Pour chaque exercice, créer des SetCompletions
    for (const exercise of session.exercises) {
      console.log(`\n📝 Processing: ${exercise.name}`);
      console.log(`   Sets planned: ${exercise.sets}`);
      console.log(`   Reps planned: ${exercise.reps}`);
      console.log(`   Weight planned: ${exercise.weight}`);

      if (!exercise.sets) {
        console.log('   ⏭️ Skipping (no sets defined)');
        continue;
      }

      // Créer des SetCompletions pour chaque série
      for (let setNum = 1; setNum <= exercise.sets; setNum++) {
        // Simuler des variations réalistes
        let repsAchieved = exercise.reps;
        let weightUsed = exercise.weight;

        // Exemple: le client a fait des variations
        if (setNum === 1) {
          // Première série: poids un peu plus lourd, moins de reps
          if (exercise.weight && exercise.weight !== 'Poids du corps') {
            const weightNum = parseInt(exercise.weight);
            if (!isNaN(weightNum)) {
              weightUsed = `${weightNum + 2.5}kg`; // +2.5kg
            }
          }
          if (exercise.reps) {
            const repsNum = parseInt(exercise.reps);
            if (!isNaN(repsNum)) {
              repsAchieved = `${repsNum - 2}`; // -2 reps
            }
          }
        } else if (setNum === exercise.sets) {
          // Dernière série: fatigue, un peu moins
          if (exercise.reps) {
            const repsNum = parseInt(exercise.reps);
            if (!isNaN(repsNum)) {
              repsAchieved = `${repsNum - 1}`; // -1 rep
            }
          }
        }
        // Séries du milieu: comme prévu

        await prisma.setCompletion.upsert({
          where: {
            exerciseId_setNumber: {
              exerciseId: exercise.id,
              setNumber: setNum,
            },
          },
          create: {
            exerciseId: exercise.id,
            setNumber: setNum,
            repsAchieved: repsAchieved,
            weightUsed: weightUsed,
            completed: true,
          },
          update: {
            repsAchieved: repsAchieved,
            weightUsed: weightUsed,
            completed: true,
          },
        });

        console.log(`   ✅ Set ${setNum}: ${repsAchieved} reps @ ${weightUsed}`);
      }
    }

    console.log('\n🎉 Set completions added successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
