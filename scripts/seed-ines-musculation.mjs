/**
 * Seed script – Données musculation pour Ines Lemaire
 * Crée : ExerciseReferences, ClientCoach (Thomas Dupont), Programme PPL, séances + exercices + setCompletions
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// IDs connus (vérifiés en base)
const INES_USER_ID       = 'b34476e4-d9b5-44b9-899f-36a2795fedbd';
const INES_CLIENT_ID     = '34b1634d-8dcd-435d-9e43-e04a50b1e771'; // clientProfile
const THOMAS_COACH_ID    = '058d2e3e-b7db-45c0-874d-2ef8feed53be'; // coachProfile

// ── Exercices de référence ────────────────────────────────────────────────
const EXERCISE_REFS = [
  {
    exerciseDbId: 'squat-barre-001',
    name: 'Squat barre',
    bodyParts: ['UPPER LEGS'],
    targetMuscles: ['Quadriceps'],
    secondaryMuscles: ['Glutes', 'Hamstrings', 'Calves'],
    equipments: ['BARBELL'],
    exerciseType: 'STRENGTH',
    instructions: ['Placez la barre sur vos trapèzes', 'Descendez en gardant le dos droit', 'Poussez sur les talons pour remonter'],
  },
  {
    exerciseDbId: 'bench-press-barre-001',
    name: 'Développé couché barre',
    bodyParts: ['CHEST'],
    targetMuscles: ['Pectoralis Major'],
    secondaryMuscles: ['Triceps Brachii', 'Anterior Deltoid'],
    equipments: ['BARBELL'],
    exerciseType: 'STRENGTH',
    instructions: ['Allongez-vous sur le banc', 'Saisissez la barre légèrement plus large que les épaules', 'Descendez la barre jusqu\'à effleurer le sternum', 'Poussez jusqu\'à extension complète'],
  },
  {
    exerciseDbId: 'deadlift-barre-001',
    name: 'Soulevé de terre',
    bodyParts: ['BACK'],
    targetMuscles: ['Erector Spinae'],
    secondaryMuscles: ['Glutes', 'Hamstrings', 'Quadriceps', 'Trapezius'],
    equipments: ['BARBELL'],
    exerciseType: 'STRENGTH',
    instructions: ['Barre au sol, pieds à largeur de hanches', 'Saisissez la barre, dos plat', 'Poussez sur les jambes et tirez la barre le long des tibias', 'Finissez en hyperextension légère'],
  },
  {
    exerciseDbId: 'ohp-barre-001',
    name: 'Développé militaire barre',
    bodyParts: ['SHOULDERS'],
    targetMuscles: ['Deltoid'],
    secondaryMuscles: ['Triceps Brachii', 'Upper Trapezius'],
    equipments: ['BARBELL'],
    exerciseType: 'STRENGTH',
    instructions: ['Barre au niveau des clavicules', 'Pressez verticalement au-dessus de la tête', 'Rentrez la tête entre les bras en haut'],
  },
  {
    exerciseDbId: 'rowing-barre-001',
    name: 'Rowing barre',
    bodyParts: ['BACK'],
    targetMuscles: ['Latissimus Dorsi'],
    secondaryMuscles: ['Biceps Brachii', 'Rhomboids', 'Rear Deltoid'],
    equipments: ['BARBELL'],
    exerciseType: 'STRENGTH',
    instructions: ['Penchez-vous en avant à 45°', 'Tirez la barre vers le bas du sternum', 'Contractez les omoplates en fin de mouvement'],
  },
  {
    exerciseDbId: 'hip-thrust-barre-001',
    name: 'Hip Thrust barre',
    bodyParts: ['UPPER LEGS'],
    targetMuscles: ['Glutes'],
    secondaryMuscles: ['Hamstrings', 'Core'],
    equipments: ['BARBELL'],
    exerciseType: 'STRENGTH',
    instructions: ['Dos appuyé sur un banc, barre sur les hanches', 'Poussez les hanches vers le plafond', 'Contractez les fessiers en haut'],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────

/** Ajoute n jours à une date */
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Progression linéaire de poids sur nbSessions */
function progressiveWeight(start, end, step, totalSteps) {
  return Math.round((start + (end - start) * (step / totalSteps)) * 2) / 2; // arrondi à 0.5
}

// ── Plan PPL ──────────────────────────────────────────────────────────────
// 3 types de séances : Push / Pull / Legs
// Répété 8 semaines (24 séances effectives)
// Départ : il y a 60 jours

const today = new Date();
today.setHours(12, 0, 0, 0);
const START_DATE = addDays(today, -63); // il y a 63 jours (9 semaines)

// Jours d'entraînement par semaine (lun / mer / ven) + repos autres jours
// On génère 9 semaines de dates
function generateSchedule() {
  const schedule = [];
  let current = new Date(START_DATE);
  const END = addDays(today, -1);

  while (current <= END) {
    const dow = current.getDay(); // 0=dim, 1=lun, 3=mer, 5=ven
    if (dow === 1 || dow === 3 || dow === 5) {
      schedule.push(new Date(current));
    }
    current = addDays(current, 1);
  }
  return schedule;
}

// ── Séances PPL (exercices par type) ─────────────────────────────────────
// Push: bench, OHP
// Pull: rowing, deadlift
// Legs: squat, hip thrust

function getSessionType(index) {
  return ['PUSH', 'PULL', 'LEGS'][index % 3];
}

function getExercisesForType(type, refs, sessionIndex, totalSessions) {
  const t = sessionIndex / totalSessions;

  if (type === 'PUSH') {
    return [
      {
        refKey: 'bench-press-barre-001',
        name: 'Développé couché barre',
        sets: 4,
        reps: '6',
        weights: [
          progressiveWeight(30, 52.5, sessionIndex, totalSessions),
          progressiveWeight(32.5, 55, sessionIndex, totalSessions),
          progressiveWeight(32.5, 55, sessionIndex, totalSessions),
          progressiveWeight(30, 52.5, sessionIndex, totalSessions),
        ],
      },
      {
        refKey: 'ohp-barre-001',
        name: 'Développé militaire barre',
        sets: 3,
        reps: '8',
        weights: [
          progressiveWeight(20, 32.5, sessionIndex, totalSessions),
          progressiveWeight(20, 32.5, sessionIndex, totalSessions),
          progressiveWeight(17.5, 30, sessionIndex, totalSessions),
        ],
      },
    ];
  }

  if (type === 'PULL') {
    return [
      {
        refKey: 'rowing-barre-001',
        name: 'Rowing barre',
        sets: 4,
        reps: '8',
        weights: [
          progressiveWeight(25, 45, sessionIndex, totalSessions),
          progressiveWeight(27.5, 47.5, sessionIndex, totalSessions),
          progressiveWeight(27.5, 47.5, sessionIndex, totalSessions),
          progressiveWeight(25, 45, sessionIndex, totalSessions),
        ],
      },
      {
        refKey: 'deadlift-barre-001',
        name: 'Soulevé de terre',
        sets: 3,
        reps: '5',
        weights: [
          progressiveWeight(40, 72.5, sessionIndex, totalSessions),
          progressiveWeight(42.5, 75, sessionIndex, totalSessions),
          progressiveWeight(40, 72.5, sessionIndex, totalSessions),
        ],
      },
    ];
  }

  // LEGS
  return [
    {
      refKey: 'squat-barre-001',
      name: 'Squat barre',
      sets: 4,
      reps: '6',
      weights: [
        progressiveWeight(35, 60, sessionIndex, totalSessions),
        progressiveWeight(37.5, 62.5, sessionIndex, totalSessions),
        progressiveWeight(37.5, 62.5, sessionIndex, totalSessions),
        progressiveWeight(35, 60, sessionIndex, totalSessions),
      ],
    },
    {
      refKey: 'hip-thrust-barre-001',
      name: 'Hip Thrust barre',
      sets: 3,
      reps: '10',
      weights: [
        progressiveWeight(40, 70, sessionIndex, totalSessions),
        progressiveWeight(42.5, 72.5, sessionIndex, totalSessions),
        progressiveWeight(40, 70, sessionIndex, totalSessions),
      ],
    },
  ];
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('▶ Démarrage du seed musculation pour Ines Lemaire...\n');

  // 1. Vérifier que les IDs existent
  const ines = await prisma.clientProfile.findUnique({ where: { id: INES_CLIENT_ID } });
  if (!ines) throw new Error(`ClientProfile introuvable : ${INES_CLIENT_ID}`);

  const thomas = await prisma.coachProfile.findUnique({ where: { id: THOMAS_COACH_ID } });
  if (!thomas) throw new Error(`CoachProfile introuvable : ${THOMAS_COACH_ID}`);

  console.log(`✅ Ines Lemaire (client) trouvée`);
  console.log(`✅ Thomas Dupont (coach) trouvé\n`);

  // 2. Créer les ExerciseReferences (skip si déjà présents)
  console.log('📚 Création des ExerciseReferences...');
  const refMap = {}; // key exerciseDbId → id BDD

  for (const ref of EXERCISE_REFS) {
    const existing = await prisma.exerciseReference.findUnique({ where: { exerciseDbId: ref.exerciseDbId } });
    if (existing) {
      refMap[ref.exerciseDbId] = existing.id;
      console.log(`  ↩ Déjà présent : ${ref.name}`);
    } else {
      const created = await prisma.exerciseReference.create({ data: ref });
      refMap[ref.exerciseDbId] = created.id;
      console.log(`  ✓ Créé : ${ref.name} (${created.id})`);
    }
  }

  // 3. ClientCoach : lier Ines à Thomas
  console.log('\n🔗 Liaison Ines → Thomas Dupont...');
  const existingLink = await prisma.clientCoach.findUnique({
    where: { clientId_coachId: { clientId: INES_CLIENT_ID, coachId: THOMAS_COACH_ID } },
  });
  if (existingLink) {
    console.log('  ↩ Lien déjà existant');
  } else {
    await prisma.clientCoach.create({
      data: {
        clientId: INES_CLIENT_ID,
        coachId: THOMAS_COACH_ID,
        isPrimary: false,
        isActive: true,
      },
    });
    console.log('  ✓ Lien créé');
  }

  // 4. Programme PPL
  console.log('\n💪 Création du programme PPL...');

  // Supprimer un programme PPL existant si présent (pour éviter les doublons de re-run)
  const existingProgram = await prisma.program.findFirst({
    where: { coachId: THOMAS_COACH_ID, clientId: INES_CLIENT_ID, title: { contains: 'PPL' } },
  });
  if (existingProgram) {
    await prisma.program.delete({ where: { id: existingProgram.id } });
    console.log('  ↩ Programme PPL précédent supprimé (re-seed)');
  }

  const program = await prisma.program.create({
    data: {
      coachId: THOMAS_COACH_ID,
      clientId: INES_CLIENT_ID,
      title: 'PPL Musculation – Progression Linéaire',
      description: 'Programme Push/Pull/Legs sur 9 semaines avec progression sur les charges. Objectif : prise de force et de masse.',
      startDate: START_DATE,
      endDate: addDays(today, 30),
      isActive: true,
      weightTrackingEnabled: true,
    },
  });
  console.log(`  ✓ Programme créé : ${program.id}`);

  // 5. Générer les séances
  const trainDays = generateSchedule();
  console.log(`\n📅 Génération de ${trainDays.length} séances...`);

  for (let i = 0; i < trainDays.length; i++) {
    const sessionDate = trainDays[i];
    const sessionType = getSessionType(i);

    // Essayer d'abord de voir si la date + programId est déjà prise
    const sessionDateStart = new Date(sessionDate);
    sessionDateStart.setHours(0, 0, 0, 0);
    const sessionDateEnd = new Date(sessionDate);
    sessionDateEnd.setHours(23, 59, 59, 999);

    const session = await prisma.session.create({
      data: {
        programId: program.id,
        date: sessionDate,
        status: 'DONE',
        name: `${sessionType} – Semaine ${Math.floor(i / 3) + 1}`,
        isRestDay: false,
        completedByClient: true,
        durationSeconds: 3600 + Math.floor(Math.random() * 900),
        notes: `Séance ${sessionType.toLowerCase()} complétée.`,
      },
    });

    // Exercices de cette séance
    const exercises = getExercisesForType(sessionType, refMap, i, trainDays.length - 1);

    for (let eIdx = 0; eIdx < exercises.length; eIdx++) {
      const exDef = exercises[eIdx];
      const refId = refMap[exDef.refKey];

      const exercise = await prisma.exercise.create({
        data: {
          sessionId: session.id,
          name: exDef.name,
          category: 'MAIN',
          sets: exDef.sets,
          reps: exDef.reps,
          exerciseRefId: refId,
          order: eIdx,
        },
      });

      // SetCompletions pour chaque série
      for (let s = 0; s < exDef.sets; s++) {
        const weight = exDef.weights[s];
        await prisma.setCompletion.create({
          data: {
            exerciseId: exercise.id,
            setNumber: s + 1,
            repsAchieved: exDef.reps,
            weightUsed: `${weight} kg`,
            completed: true,
            rpe: 7 + Math.random() * 1.5,
          },
        });
      }
    }

    const weekNum = Math.floor(i / 3) + 1;
    if (i % 3 === 2) {
      process.stdout.write(`  ✓ Semaine ${weekNum} : PUSH + PULL + LEGS\n`);
    }
  }

  // 6. DailyStat pour les jours d'entraînement (poids progressif)
  console.log('\n📊 Ajout des DailyStats...');
  for (let i = 0; i < trainDays.length; i++) {
    const d = trainDays[i];
    const existingStat = await prisma.dailyStat.findFirst({
      where: {
        clientId: INES_CLIENT_ID,
        date: { gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()), lt: addDays(d, 1) },
      },
    });
    if (!existingStat) {
      const startWeight = 63.5;
      const endWeight = 61.0;
      const w = progressiveWeight(startWeight, endWeight, i, trainDays.length - 1);
      await prisma.dailyStat.create({
        data: {
          clientId: INES_CLIENT_ID,
          date: d,
          weight: w,
          sleepHours: 7 + Math.random() * 1.5,
          waterIntake: 1.8 + Math.random() * 0.8,
        },
      });
    }
  }
  console.log('  ✓ DailyStats créés');

  console.log('\n✅ Seed terminé avec succès !');
  console.log(`   Programme : ${program.id}`);
  console.log(`   Séances   : ${trainDays.length}`);
  console.log(`   Exercices : ~${trainDays.length * 2} (2 par séance)`);
  console.log(`   Sets      : ~${trainDays.length * 7} (7 par séance en moyenne)`);
}

main()
  .catch((e) => { console.error('❌ Erreur :', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
