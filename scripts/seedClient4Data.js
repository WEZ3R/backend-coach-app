import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CLIENT_ID = '84954793-e2ca-44f3-9158-463847c55364'; // Thomas Lefebvre
const CLIENT_PROFILE_ID = 'ac2158e4-d27e-434f-915b-a1ef7b58ef1b';
const COACH_ID = 'aa3af737-c702-4ca5-b76c-5f6648bdea24';

// Date de début du programme : il y a 30 jours
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30);
startDate.setHours(0, 0, 0, 0);

// Date de fin : dans 30 jours
const endDate = new Date();
endDate.setDate(endDate.getDate() + 30);
endDate.setHours(23, 59, 59, 999);

async function main() {
  console.log('🏋️ Création du programme pour Thomas Lefebvre...');

  // Créer le programme
  const program = await prisma.program.create({
    data: {
      coachId: COACH_ID,
      clientId: CLIENT_PROFILE_ID,
      title: 'Programme Force & Endurance - 2 mois',
      description: 'Programme complet de développement de la force et de l\'endurance sur 2 mois avec 4 séances par semaine',
      startDate: startDate,
      endDate: endDate,
      cycleDays: 7,
      isActive: true,
      dietEnabled: true,
      dietType: 'calories',
      targetCalories: 2800,
      waterTrackingEnabled: true,
      waterGoal: 3.0,
      sleepTrackingEnabled: true,
      weightTrackingEnabled: true,
    },
  });

  console.log(`✅ Programme créé : ${program.id}`);

  // Objectifs personnalisés
  const customGoals = [
    { title: 'Boire un verre d\'eau au réveil', description: 'Hydratation matinale' },
    { title: 'Faire 10 minutes d\'étirements', description: 'Mobilité et récupération' },
    { title: 'Prendre mes protéines post-workout', description: 'Après chaque séance' },
  ];

  for (let i = 0; i < customGoals.length; i++) {
    await prisma.customGoal.create({
      data: {
        programId: program.id,
        title: customGoals[i].title,
        description: customGoals[i].description,
        order: i,
      },
    });
  }

  console.log(`✅ ${customGoals.length} objectifs personnalisés créés`);

  // Programme d'entraînement sur 7 jours (cycle)
  const weekProgram = [
    {
      // Lundi - Haut du corps (Push)
      exercises: [
        { name: 'Développé couché', category: 'MAIN', sets: 4, reps: '8-10', weight: '80kg', restTime: '2min' },
        { name: 'Développé incliné haltères', category: 'MAIN', sets: 3, reps: '10-12', weight: '30kg', restTime: '90s' },
        { name: 'Dips', category: 'MAIN', sets: 3, reps: '12-15', weight: 'Poids du corps', restTime: '90s' },
        { name: 'Élévations latérales', category: 'MAIN', sets: 3, reps: '12-15', weight: '12kg', restTime: '60s' },
        { name: 'Extension triceps poulie', category: 'MAIN', sets: 3, reps: '12-15', weight: '25kg', restTime: '60s' },
        { name: 'Planche', category: 'STRETCHING', sets: 3, reps: '45s', restTime: '60s' },
      ],
    },
    {
      // Mardi - Bas du corps
      exercises: [
        { name: 'Squats', category: 'MAIN', sets: 4, reps: '8-10', weight: '100kg', restTime: '2min' },
        { name: 'Presse à cuisses', category: 'MAIN', sets: 3, reps: '12-15', weight: '150kg', restTime: '90s' },
        { name: 'Fentes bulgares', category: 'MAIN', sets: 3, reps: '10-12 par jambe', weight: '20kg', restTime: '90s' },
        { name: 'Leg curl', category: 'MAIN', sets: 3, reps: '12-15', weight: '40kg', restTime: '60s' },
        { name: 'Mollets debout', category: 'MAIN', sets: 4, reps: '15-20', weight: '80kg', restTime: '60s' },
        { name: 'Étirements jambes', category: 'STRETCHING', sets: 1, reps: '10min' },
      ],
    },
    {
      // Mercredi - Repos
      isRestDay: true,
    },
    {
      // Jeudi - Haut du corps (Pull)
      exercises: [
        { name: 'Tractions', category: 'MAIN', sets: 4, reps: '8-10', weight: 'Poids du corps', restTime: '2min' },
        { name: 'Rowing barre', category: 'MAIN', sets: 4, reps: '8-10', weight: '70kg', restTime: '90s' },
        { name: 'Tirage horizontal', category: 'MAIN', sets: 3, reps: '10-12', weight: '60kg', restTime: '90s' },
        { name: 'Curl biceps haltères', category: 'MAIN', sets: 3, reps: '12-15', weight: '16kg', restTime: '60s' },
        { name: 'Curl marteau', category: 'MAIN', sets: 3, reps: '12-15', weight: '14kg', restTime: '60s' },
        { name: 'Face pulls', category: 'MAIN', sets: 3, reps: '15-20', weight: '15kg', restTime: '60s' },
      ],
    },
    {
      // Vendredi - Cardio & Core
      exercises: [
        { name: 'Vélo elliptique', category: 'CARDIO', sets: 1, reps: '20min', restTime: 'Zone cardio modérée' },
        { name: 'Burpees', category: 'CARDIO', sets: 4, reps: '15', restTime: '60s' },
        { name: 'Mountain climbers', category: 'CARDIO', sets: 4, reps: '30s', restTime: '45s' },
        { name: 'Crunch', category: 'MAIN', sets: 4, reps: '20', restTime: '45s' },
        { name: 'Russian twists', category: 'MAIN', sets: 3, reps: '20 par côté', weight: '10kg', restTime: '45s' },
        { name: 'Gainage latéral', category: 'MAIN', sets: 3, reps: '30s par côté', restTime: '45s' },
      ],
    },
    {
      // Samedi - Repos
      isRestDay: true,
    },
    {
      // Dimanche - Repos
      isRestDay: true,
    },
  ];

  // Créer les séances pour les 60 jours
  const sessionsCreated = [];
  for (let day = 0; day < 60; day++) {
    const sessionDate = new Date(startDate);
    sessionDate.setDate(startDate.getDate() + day);

    const dayOfWeek = day % 7;
    const dayProgram = weekProgram[dayOfWeek];

    const session = await prisma.session.create({
      data: {
        programId: program.id,
        date: sessionDate,
        status: day < 30 ? 'DONE' : 'EMPTY', // Les 30 premiers jours sont complétés
        isRestDay: dayProgram.isRestDay || false,
        notes: dayProgram.isRestDay ? 'Jour de repos - récupération active' : null,
      },
    });

    // Ajouter les exercices si ce n'est pas un jour de repos
    if (!dayProgram.isRestDay && dayProgram.exercises) {
      for (let i = 0; i < dayProgram.exercises.length; i++) {
        const ex = dayProgram.exercises[i];
        await prisma.exercise.create({
          data: {
            sessionId: session.id,
            name: ex.name,
            category: ex.category,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            restTime: ex.restTime,
            order: i,
          },
        });
      }
    }

    sessionsCreated.push(session);
  }

  console.log(`✅ ${sessionsCreated.length} séances créées`);

  // Générer les statistiques quotidiennes pour les 30 derniers jours
  let currentWeight = 85.0; // Poids initial
  const weightLossPerDay = 0.05; // Perte de 1.5kg sur le mois

  for (let day = 0; day < 30; day++) {
    const statDate = new Date(startDate);
    statDate.setDate(startDate.getDate() + day);
    statDate.setHours(12, 0, 0, 0);

    // Variation réaliste du poids (tendance à la baisse avec variations)
    const variation = (Math.random() - 0.5) * 0.3;
    currentWeight -= weightLossPerDay + variation;

    // Horaires de sommeil réalistes (variation entre 22h-23h30 et 6h-7h30)
    const bedTimeHour = 22 + Math.floor(Math.random() * 2);
    const bedTimeMinute = Math.floor(Math.random() * 60);
    const bedTime = new Date(statDate);
    bedTime.setHours(bedTimeHour, bedTimeMinute, 0, 0);
    bedTime.setDate(bedTime.getDate() - 1); // Veille au soir

    const wakeTimeHour = 6 + Math.floor(Math.random() * 2);
    const wakeTimeMinute = Math.floor(Math.random() * 60);
    const wakeTime = new Date(statDate);
    wakeTime.setHours(wakeTimeHour, wakeTimeMinute, 0, 0);

    const sleepHours = (wakeTime - bedTime) / (1000 * 60 * 60);

    // Consommation d'eau (objectif 3L, avec variation)
    const waterIntake = 2.5 + Math.random() * 1.0;

    // Calories (objectif 2800, avec variation)
    const totalCalories = 2600 + Math.floor(Math.random() * 400);

    // Heure d'entraînement pour les jours d'entraînement
    const dayOfWeek = day % 7;
    const isTrainingDay = ![2, 5, 6].includes(dayOfWeek); // Pas mercredi, samedi, dimanche

    const workoutTime = isTrainingDay ? (() => {
      const wt = new Date(statDate);
      const hour = 18 + Math.floor(Math.random() * 2); // Entre 18h et 20h
      wt.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
      return wt;
    })() : null;

    const workoutDuration = isTrainingDay ? 60 + Math.floor(Math.random() * 30) : null; // 60-90 min

    await prisma.dailyStat.create({
      data: {
        clientId: CLIENT_PROFILE_ID,
        date: statDate,
        sleepHours: Math.round(sleepHours * 10) / 10,
        bedTime: bedTime,
        wakeTime: wakeTime,
        waterIntake: Math.round(waterIntake * 10) / 10,
        weight: Math.round(currentWeight * 10) / 10,
        totalCalories: totalCalories,
        workoutTime: workoutTime,
        workoutDuration: workoutDuration,
        notes: isTrainingDay ? 'Bonne séance ! Progression constante.' : 'Jour de repos bien mérité',
      },
    });

    // Complétion des objectifs personnalisés (90% de completion pour un client assidu)
    const goals = await prisma.customGoal.findMany({
      where: { programId: program.id },
    });

    for (const goal of goals) {
      const completed = Math.random() > 0.1; // 90% de réussite
      await prisma.goalCompletion.create({
        data: {
          customGoalId: goal.id,
          clientId: CLIENT_PROFILE_ID,
          date: statDate,
          completed: completed,
        },
      });
    }
  }

  console.log('✅ 30 jours de statistiques quotidiennes créés');
  console.log('✅ Complétion des objectifs personnalisés créée');

  console.log('\n🎉 Données complètes générées pour Thomas Lefebvre (client 4) !');
  console.log(`📊 Programme: ${program.title}`);
  console.log(`📅 Période: ${startDate.toLocaleDateString('fr-FR')} → ${endDate.toLocaleDateString('fr-FR')}`);
  console.log(`💪 ${sessionsCreated.length} séances créées (30 complétées, 30 à venir)`);
  console.log(`📈 30 jours de statistiques détaillées`);
  console.log(`🎯 ${customGoals.length} objectifs personnalisés avec completion quotidienne`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
