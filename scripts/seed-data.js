import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/bcrypt.js';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🌱 Seeding database...\n');

    // Create Coach Marc Yrius
    console.log('👤 Creating coach Marc Yrius...');
    const hashedPassword = await hashPassword('123456');

    const coach = await prisma.user.create({
      data: {
        email: 'marcyrius98@gmail.com',
        password: hashedPassword,
        role: 'COACH',
        firstName: 'Marc',
        lastName: 'Yrius',
        coachProfile: {
          create: {
            bio: 'Coach sportif professionnel',
            experience: '5 ans d\'expérience',
            city: 'Paris',
            rating: 4.8,
            ratingCount: 15,
            trainingLocations: ['Basic-Fit', 'Parc', 'Domicile du client'],
            isRemote: true,
          },
        },
      },
      include: {
        coachProfile: true,
      },
    });
    console.log('✅ Coach created:', coach.email);

    // Create Client 4
    console.log('\n👤 Creating client Client 4...');
    const client = await prisma.user.create({
      data: {
        email: 'client4@test.com',
        password: hashedPassword,
        role: 'CLIENT',
        firstName: 'Client',
        lastName: '4',
        clientProfile: {
          create: {
            coachId: coach.coachProfile.id,
            weight: 75,
            height: 175,
            goals: 'Prise de masse musculaire',
            level: 'Intermédiaire',
          },
        },
      },
      include: {
        clientProfile: true,
      },
    });
    console.log('✅ Client created:', client.email);

    // Create Program (2 months, started 1 month ago)
    console.log('\n📋 Creating program...');
    const today = new Date();
    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthLater = new Date(today);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    const program = await prisma.program.create({
      data: {
        coachId: coach.coachProfile.id,
        clientId: client.id,
        title: 'Programme Prise de Masse',
        description: 'Programme de 2 mois pour la prise de masse musculaire',
        startDate: oneMonthAgo,
        endDate: oneMonthLater,
        isActive: true,
        cycleDays: 7,
        dietEnabled: true,
        dietType: 'calories',
        targetCalories: 2800,
        waterTrackingEnabled: true,
        waterGoal: 3.0,
        sleepTrackingEnabled: true,
        weightTrackingEnabled: true,
      },
    });
    console.log('✅ Program created:', program.title);

    // Create sessions for the past month (30 days)
    console.log('\n🏋️ Creating sessions for the past month...');

    const workoutPattern = [
      { day: 0, isRest: true, title: 'Repos' },
      { day: 1, isRest: false, title: 'Pectoraux / Triceps' },
      { day: 2, isRest: false, title: 'Dos / Biceps' },
      { day: 3, isRest: true, title: 'Repos' },
      { day: 4, isRest: false, title: 'Jambes / Épaules' },
      { day: 5, isRest: false, title: 'Full Body' },
      { day: 6, isRest: true, title: 'Repos' },
    ];

    const exercises = {
      'Pectoraux / Triceps': [
        { name: 'Développé couché', category: 'MAIN', sets: 4, reps: '10', weight: '80kg', restTime: '90s' },
        { name: 'Développé incliné', category: 'MAIN', sets: 3, reps: '12', weight: '65kg', restTime: '90s' },
        { name: 'Écartés haltères', category: 'MAIN', sets: 3, reps: '15', weight: '20kg', restTime: '60s' },
        { name: 'Dips triceps', category: 'MAIN', sets: 3, reps: '12', weight: 'Poids du corps', restTime: '60s' },
        { name: 'Extensions triceps', category: 'MAIN', sets: 3, reps: '15', weight: '15kg', restTime: '60s' },
      ],
      'Dos / Biceps': [
        { name: 'Tractions', category: 'MAIN', sets: 4, reps: '10', weight: 'Poids du corps', restTime: '90s' },
        { name: 'Rowing barre', category: 'MAIN', sets: 4, reps: '10', weight: '70kg', restTime: '90s' },
        { name: 'Tirage horizontal', category: 'MAIN', sets: 3, reps: '12', weight: '60kg', restTime: '60s' },
        { name: 'Curl barre', category: 'MAIN', sets: 3, reps: '12', weight: '30kg', restTime: '60s' },
        { name: 'Curl haltères', category: 'MAIN', sets: 3, reps: '15', weight: '15kg', restTime: '60s' },
      ],
      'Jambes / Épaules': [
        { name: 'Squat', category: 'MAIN', sets: 4, reps: '10', weight: '100kg', restTime: '120s' },
        { name: 'Presse à cuisses', category: 'MAIN', sets: 3, reps: '12', weight: '150kg', restTime: '90s' },
        { name: 'Leg curl', category: 'MAIN', sets: 3, reps: '15', weight: '50kg', restTime: '60s' },
        { name: 'Développé militaire', category: 'MAIN', sets: 4, reps: '10', weight: '50kg', restTime: '90s' },
        { name: 'Élévations latérales', category: 'MAIN', sets: 3, reps: '15', weight: '12kg', restTime: '60s' },
      ],
      'Full Body': [
        { name: 'Échauffement cardio', category: 'WARMUP', duration: '10 min' },
        { name: 'Développé couché', category: 'MAIN', sets: 3, reps: '12', weight: '70kg', restTime: '90s' },
        { name: 'Squat', category: 'MAIN', sets: 3, reps: '12', weight: '90kg', restTime: '90s' },
        { name: 'Rowing', category: 'MAIN', sets: 3, reps: '12', weight: '60kg', restTime: '90s' },
        { name: 'Étirements', category: 'STRETCHING', duration: '10 min' },
      ],
    };

    let sessionCount = 0;
    let completedSessions = 0;

    for (let i = 30; i >= 0; i--) {
      const sessionDate = new Date(today);
      sessionDate.setDate(sessionDate.getDate() - i);
      sessionDate.setHours(12, 0, 0, 0);

      const dayOfWeek = sessionDate.getDay();
      const workout = workoutPattern[dayOfWeek];

      const isCompleted = i > 0; // Toutes les séances passées sont complétées, aujourd'hui non

      const sessionData = {
        programId: program.id,
        date: sessionDate,
        status: isCompleted ? 'DONE' : 'DRAFT',
        isRestDay: workout.isRest,
        notes: workout.isRest ? 'Jour de repos pour la récupération' : 'Bonne séance !',
      };

      if (!workout.isRest && exercises[workout.title]) {
        sessionData.exercises = {
          create: exercises[workout.title].map((ex, index) => ({
            name: ex.name,
            category: ex.category,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            restTime: ex.restTime,
            duration: ex.duration,
            order: index,
          })),
        };
      }

      await prisma.session.create({
        data: sessionData,
      });

      sessionCount++;
      if (isCompleted) completedSessions++;
    }

    console.log(`✅ Created ${sessionCount} sessions (${completedSessions} completed)`);

    // Create some daily stats for the past month
    console.log('\n📊 Creating daily stats...');
    let statsCount = 0;

    for (let i = 30; i >= 1; i--) {
      const statDate = new Date(today);
      statDate.setDate(statDate.getDate() - i);
      statDate.setHours(0, 0, 0, 0);

      await prisma.dailyStat.create({
        data: {
          clientId: client.clientProfile.id,
          date: statDate,
          sleepHours: 7 + Math.random() * 2, // 7-9 heures
          waterIntake: 2.5 + Math.random() * 1, // 2.5-3.5 litres
          weight: 75 + Math.random() * 2 - 1, // 74-76 kg
          totalCalories: 2600 + Math.floor(Math.random() * 400), // 2600-3000 cal
        },
      });
      statsCount++;
    }

    console.log(`✅ Created ${statsCount} daily stats entries`);

    // Create custom goals
    console.log('\n🎯 Creating custom goals...');
    await prisma.customGoal.create({
      data: {
        programId: program.id,
        title: 'Boire 3L d\'eau',
        description: 'Hydratation quotidienne',
        order: 0,
      },
    });

    await prisma.customGoal.create({
      data: {
        programId: program.id,
        title: 'Dormir 8h',
        description: 'Sommeil réparateur',
        order: 1,
      },
    });

    console.log('✅ Custom goals created');

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Coach: marcyrius98@gmail.com / 123456');
    console.log('   Client: client4@test.com / 123456');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
