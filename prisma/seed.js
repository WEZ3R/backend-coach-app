/**
 * Seed FitFlow – données de test complètes
 *
 * Crée : 5 coachs, 30 clients (6 par coach), 30 programmes,
 *        ~1600 séances avec exercices, ~2000 stats quotidiennes.
 *
 * Mot de passe de tous les comptes : Password123!
 *
 * NOTE SCHÉMA : DailyStat.date possède un @unique en plus du @@unique([clientId, date]).
 * Ce @unique seul est probablement une erreur (devrait être uniquement la contrainte composée).
 * Contournement : chaque client reçoit des timestamps décalés de (clientIndex) ms,
 * ce qui les rend uniques au niveau PostgreSQL tout en restant sur le même jour calendaire.
 *
 * Usage : npm run seed
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

// Construire DATABASE_URL depuis les variables individuelles si absent
if (!process.env.DATABASE_URL) {
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
  process.env.DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const rand = (min, max) => Math.random() * (max - min) + min;
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const round1 = (n) => Math.round(n * 10) / 10;

/** Date à N jours en arrière, avec offsetMs pour rendre le timestamp unique */
const dayAt = (daysAgo, offsetMs = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, offsetMs);
  return d;
};

// ─── Données coachs ───────────────────────────────────────────────────────────

const COACHES = [
  {
    firstName: 'Thomas', lastName: 'Dupont',
    email: 'thomas.dupont@fitflow-seed.com',
    bio: 'Coach spécialisé musculation et force. 8 ans d\'expérience, certifié BPJEPS.',
    experience: '8 ans', city: 'Paris', isRemote: false,
    specialty: 'musculation',
  },
  {
    firstName: 'Sarah', lastName: 'Martin',
    email: 'sarah.martin@fitflow-seed.com',
    bio: 'Experte cardio-training et endurance. Diplômée STAPS, ancienne athlète.',
    experience: '6 ans', city: 'Lyon', isRemote: true,
    specialty: 'cardio',
  },
  {
    firstName: 'Nicolas', lastName: 'Bernard',
    email: 'nicolas.bernard@fitflow-seed.com',
    bio: 'Coach CrossFit et HIIT. Ancien militaire reconverti dans le coaching haute intensité.',
    experience: '5 ans', city: 'Bordeaux', isRemote: false,
    specialty: 'crossfit',
  },
  {
    firstName: 'Emma', lastName: 'Leroy',
    email: 'emma.leroy@fitflow-seed.com',
    bio: 'Yoga et mobilité. Approche holistique du bien-être, certifiée 500h RYT.',
    experience: '10 ans', city: 'Marseille', isRemote: true,
    specialty: 'yoga',
  },
  {
    firstName: 'Julien', lastName: 'Petit',
    email: 'julien.petit@fitflow-seed.com',
    bio: 'Spécialiste perte de poids et nutrition sportive. Diététicien DE + coach fitness.',
    experience: '7 ans', city: 'Toulouse', isRemote: true,
    specialty: 'nutrition',
  },
];

// ─── Données clients (6 par coach, coachIndex 0-4) ───────────────────────────

const CLIENTS = [
  // ── Thomas (musculation)
  { firstName: 'Antoine',   lastName: 'Moreau',     email: 'antoine.moreau@fitflow-seed.com',     gender: 'male',   birthYear: 1996, weight: 85,  height: 178, level: 'intermédiaire', goals: 'Prise de masse musculaire',            coachIndex: 0, program: 'Prise de masse – Phase 1',         weightTrend: 'gain' },
  { firstName: 'Lucas',     lastName: 'Girard',     email: 'lucas.girard@fitflow-seed.com',       gender: 'male',   birthYear: 1992, weight: 92,  height: 181, level: 'avancé',         goals: 'Force maximale et hypertrophie',       coachIndex: 0, program: 'Force maximale – Powerlifting',    weightTrend: 'gain' },
  { firstName: 'Maxime',    lastName: 'Roux',       email: 'maxime.roux@fitflow-seed.com',         gender: 'male',   birthYear: 2000, weight: 70,  height: 175, level: 'débutant',       goals: 'Prendre du muscle, se renforcer',      coachIndex: 0, program: 'Prise de masse – Débutant',        weightTrend: 'gain' },
  { firstName: 'Laura',     lastName: 'Blanc',      email: 'laura.blanc@fitflow-seed.com',         gender: 'female', birthYear: 1997, weight: 58,  height: 165, level: 'intermédiaire', goals: 'Tonification et galbe musculaire',     coachIndex: 0, program: 'Tonification Corps Entier',        weightTrend: 'stable' },
  { firstName: 'Hugo',      lastName: 'Faure',      email: 'hugo.faure@fitflow-seed.com',           gender: 'male',   birthYear: 1989, weight: 100, height: 185, level: 'avancé',         goals: 'Force et hypertrophie – niveau élite', coachIndex: 0, program: 'Force maximale – Powerlifting',    weightTrend: 'gain' },
  { firstName: 'Camille',   lastName: 'Dubois',     email: 'camille.dubois@fitflow-seed.com',     gender: 'female', birthYear: 1995, weight: 62,  height: 168, level: 'débutant',       goals: 'Remise en forme générale',             coachIndex: 0, program: 'Remise en forme – 12 semaines',    weightTrend: 'stable' },

  // ── Sarah (cardio)
  { firstName: 'Marie',     lastName: 'Rousseau',   email: 'marie.rousseau@fitflow-seed.com',     gender: 'female', birthYear: 1991, weight: 65,  height: 167, level: 'intermédiaire', goals: 'Améliorer mon endurance cardiovasculaire', coachIndex: 1, program: 'Cardio Endurance – 10km',          weightTrend: 'stable' },
  { firstName: 'Pauline',   lastName: 'Garnier',    email: 'pauline.garnier@fitflow-seed.com',   gender: 'female', birthYear: 1999, weight: 55,  height: 160, level: 'débutant',       goals: 'Perdre du poids et commencer à courir',   coachIndex: 1, program: 'Perte de poids – Cardio',          weightTrend: 'loss' },
  { firstName: 'Théo',      lastName: 'Morin',      email: 'theo.morin@fitflow-seed.com',         gender: 'male',   birthYear: 1983, weight: 78,  height: 176, level: 'intermédiaire', goals: 'Préparer un semi-marathon en 4 mois',      coachIndex: 1, program: 'Cardio Endurance – Semi-marathon',  weightTrend: 'stable' },
  { firstName: 'Inès',      lastName: 'Lemaire',    email: 'ines.lemaire@fitflow-seed.com',       gender: 'female', birthYear: 1986, weight: 72,  height: 169, level: 'intermédiaire', goals: 'Retrouver la forme après grossesse',       coachIndex: 1, program: 'Remise en forme – Post-natal',      weightTrend: 'loss' },
  { firstName: 'Raphaël',   lastName: 'Simon',      email: 'raphael.simon@fitflow-seed.com',     gender: 'male',   birthYear: 1995, weight: 80,  height: 179, level: 'débutant',       goals: 'Perdre 10 kg en 6 mois',                  coachIndex: 1, program: 'Perte de poids – Cardio',          weightTrend: 'loss' },
  { firstName: 'Jade',      lastName: 'Mercier',    email: 'jade.mercier@fitflow-seed.com',       gender: 'female', birthYear: 2002, weight: 52,  height: 162, level: 'avancé',         goals: 'Performance cardio – compétition',         coachIndex: 1, program: 'Performance – Compétition',        weightTrend: 'stable' },

  // ── Nicolas (crossfit)
  { firstName: 'Baptiste',  lastName: 'Laurent',    email: 'baptiste.laurent@fitflow-seed.com',   gender: 'male',   birthYear: 1998, weight: 82,  height: 180, level: 'intermédiaire', goals: 'CrossFit et conditionnement physique',  coachIndex: 2, program: 'CrossFit Fondamentaux',            weightTrend: 'stable' },
  { firstName: 'Alexis',    lastName: 'Bonnet',     email: 'alexis.bonnet@fitflow-seed.com',       gender: 'male',   birthYear: 1994, weight: 88,  height: 183, level: 'avancé',         goals: 'Performance CrossFit – WOD élite',      coachIndex: 2, program: 'CrossFit Performance',            weightTrend: 'gain' },
  { firstName: 'Chloé',     lastName: 'Perrin',     email: 'chloe.perrin@fitflow-seed.com',       gender: 'female', birthYear: 1997, weight: 60,  height: 166, level: 'intermédiaire', goals: 'CrossFit et tonification',               coachIndex: 2, program: 'CrossFit Fondamentaux',            weightTrend: 'stable' },
  { firstName: 'Nicolas',   lastName: 'Fontaine',   email: 'nicolas.fontaine@fitflow-seed.com',   gender: 'male',   birthYear: 1990, weight: 95,  height: 188, level: 'débutant',       goals: 'Se remettre au sport sérieusement',      coachIndex: 2, program: 'HIIT & Force – Débutant',         weightTrend: 'loss' },
  { firstName: 'Manon',     lastName: 'Chevalier',  email: 'manon.chevalier@fitflow-seed.com',   gender: 'female', birthYear: 2001, weight: 57,  height: 163, level: 'débutant',       goals: 'Perdre du gras et se muscler',           coachIndex: 2, program: 'HIIT & Force – Débutant',         weightTrend: 'stable' },
  { firstName: 'Kévin',     lastName: 'Arnaud',     email: 'kevin.arnaud@fitflow-seed.com',       gender: 'male',   birthYear: 1993, weight: 91,  height: 182, level: 'avancé',         goals: 'CrossFit compétition régionale',         coachIndex: 2, program: 'CrossFit Performance',            weightTrend: 'gain' },

  // ── Emma (yoga)
  { firstName: 'Sophie',    lastName: 'Renard',     email: 'sophie.renard@fitflow-seed.com',       gender: 'female', birthYear: 1979, weight: 63,  height: 164, level: 'intermédiaire', goals: 'Réduire le stress et améliorer la flexibilité', coachIndex: 3, program: 'Yoga & Bien-être',               weightTrend: 'stable' },
  { firstName: 'Julie',     lastName: 'Legrand',    email: 'julie.legrand@fitflow-seed.com',       gender: 'female', birthYear: 1972, weight: 67,  height: 166, level: 'débutant',       goals: 'Découvrir le yoga, assouplissement',           coachIndex: 3, program: 'Yoga Débutant – Flexibilité',    weightTrend: 'stable' },
  { firstName: 'Claire',    lastName: 'Muller',     email: 'claire.muller@fitflow-seed.com',       gender: 'female', birthYear: 1986, weight: 58,  height: 160, level: 'avancé',         goals: 'Yoga avancé et pratique de méditation',        coachIndex: 3, program: 'Yoga Avancé',                    weightTrend: 'stable' },
  { firstName: 'Pierre',    lastName: 'Dupuis',     email: 'pierre.dupuis@fitflow-seed.com',       gender: 'male',   birthYear: 1976, weight: 82,  height: 177, level: 'débutant',       goals: 'Mobilité et gestion du stress au travail',     coachIndex: 3, program: 'Mobilité & Yoga Doux',           weightTrend: 'stable' },
  { firstName: 'Nathalie',  lastName: 'Giraud',     email: 'nathalie.giraud@fitflow-seed.com',   gender: 'female', birthYear: 1969, weight: 70,  height: 163, level: 'débutant',       goals: 'Bien-être, souplesse et relaxation',           coachIndex: 3, program: 'Yoga Débutant – Flexibilité',    weightTrend: 'stable' },
  { firstName: 'Valentin',  lastName: 'Roussel',    email: 'valentin.roussel@fitflow-seed.com',   gender: null,     birthYear: 1988, weight: null, height: null, level: null,            goals: 'Améliorer ma mobilité et récupération',        coachIndex: 3, program: 'Mobilité & Yoga Doux',           weightTrend: 'stable' },

  // ── Julien (nutrition)
  { firstName: 'Mathieu',   lastName: 'Guerin',     email: 'mathieu.guerin@fitflow-seed.com',     gender: 'male',   birthYear: 1985, weight: 105, height: 180, level: 'débutant',       goals: 'Perdre 20 kg, retrouver de l\'énergie',   coachIndex: 4, program: 'Perte de poids – Plan Nutrition',  weightTrend: 'loss' },
  { firstName: 'Amélie',    lastName: 'Bernard',    email: 'amelie.bernard@fitflow-seed.com',     gender: 'female', birthYear: 1993, weight: 75,  height: 168, level: 'intermédiaire', goals: 'Perdre 10 kg durablement sans frustration', coachIndex: 4, program: 'Perte de poids – Plan Nutrition',  weightTrend: 'loss' },
  { firstName: 'Thomas',    lastName: 'Martin',     email: 'thomas.martin@fitflow-seed.com',       gender: 'male',   birthYear: 1980, weight: 98,  height: 183, level: 'débutant',       goals: 'Rééquilibrage alimentaire complet',         coachIndex: 4, program: 'Rééquilibrage Alimentaire',        weightTrend: 'loss' },
  { firstName: 'Lucie',     lastName: 'Fournier',   email: 'lucie.fournier@fitflow-seed.com',     gender: 'female', birthYear: 1996, weight: 68,  height: 165, level: 'intermédiaire', goals: 'Optimiser la nutrition sportive',            coachIndex: 4, program: 'Rééquilibrage Alimentaire',        weightTrend: 'stable' },
  { firstName: 'Sébastien', lastName: 'Leroux',     email: 'sebastien.leroux@fitflow-seed.com',   gender: 'male',   birthYear: 1982, weight: 112, height: 178, level: 'débutant',       goals: 'Perdre du poids et retrouver de l\'énergie', coachIndex: 4, program: 'Perte de poids – Plan Nutrition',  weightTrend: 'loss' },
  { firstName: 'Noémie',    lastName: 'Carpentier', email: 'noemie.carpentier@fitflow-seed.com',   gender: null,     birthYear: 1998, weight: 61,  height: null, level: 'débutant',       goals: 'Manger mieux et perdre quelques kilos',      coachIndex: 4, program: 'Perte de poids – Plan Nutrition',  weightTrend: 'loss' },
];

// ─── Exercices par spécialité ─────────────────────────────────────────────────

const EXERCISES = {
  musculation: [
    { name: 'Échauffement articulaire',  category: 'WARMUP',     sets: 1, reps: '10min',  restTime: '0' },
    { name: 'Développé couché barre',    category: 'MAIN',       sets: 4, reps: '8-10',   restTime: '3min', weight: '80kg' },
    { name: 'Squat barre',               category: 'MAIN',       sets: 4, reps: '5',      restTime: '4min', weight: '100kg' },
    { name: 'Soulevé de terre',          category: 'MAIN',       sets: 3, reps: '5',      restTime: '4min', weight: '120kg' },
    { name: 'Tractions lestées',         category: 'MAIN',       sets: 4, reps: '6-8',    restTime: '2min', weight: '+10kg' },
    { name: 'Développé militaire',       category: 'MAIN',       sets: 3, reps: '10-12',  restTime: '2min', weight: '50kg' },
    { name: 'Gainage',                   category: 'MAIN',       sets: 3, reps: '60s',    restTime: '1min' },
    { name: 'Étirements quadriceps',     category: 'STRETCHING', sets: 2, reps: '45s',    restTime: '0' },
    { name: 'Étirements pectoraux',      category: 'STRETCHING', sets: 2, reps: '45s',    restTime: '0' },
  ],
  cardio: [
    { name: 'Marche rapide 10min',       category: 'WARMUP',     sets: 1, reps: '10min',  restTime: '0',    duration: '10min' },
    { name: 'Course à pied',             category: 'CARDIO',     sets: 1, reps: '30min',  restTime: '0',    duration: '30min' },
    { name: 'Vélo elliptique',           category: 'CARDIO',     sets: 1, reps: '20min',  restTime: '0',    duration: '20min' },
    { name: 'HIIT – Sprints 30/90',      category: 'CARDIO',     sets: 8, reps: '30s',    restTime: '90s' },
    { name: 'Gainage latéral',           category: 'MAIN',       sets: 3, reps: '45s',    restTime: '1min' },
    { name: 'Montées de genoux',         category: 'WARMUP',     sets: 3, reps: '20',     restTime: '30s' },
    { name: 'Étirements dynamiques',     category: 'STRETCHING', sets: 1, reps: '10min',  restTime: '0',    duration: '10min' },
  ],
  crossfit: [
    { name: 'Corde à sauter double under', category: 'WARMUP',  sets: 3, reps: '50',     restTime: '1min' },
    { name: 'Burpees',                   category: 'MAIN',       sets: 5, reps: '10',     restTime: '1min' },
    { name: 'Clean & Jerk',              category: 'MAIN',       sets: 4, reps: '5',      restTime: '2min', weight: '60kg' },
    { name: 'Box Jump',                  category: 'CARDIO',     sets: 4, reps: '10',     restTime: '1min' },
    { name: 'Tractions kipping',         category: 'MAIN',       sets: 4, reps: '12',     restTime: '2min' },
    { name: 'Kettlebell Swing',          category: 'MAIN',       sets: 4, reps: '15',     restTime: '1min', weight: '24kg' },
    { name: 'Thrusters',                 category: 'MAIN',       sets: 3, reps: '10',     restTime: '2min', weight: '40kg' },
    { name: 'Foam rolling',              category: 'STRETCHING', sets: 1, reps: '10min',  restTime: '0',    duration: '10min' },
  ],
  yoga: [
    { name: 'Salutation au soleil',      category: 'WARMUP',     sets: 3, reps: '5 cycles', restTime: '0' },
    { name: 'Posture du guerrier I',     category: 'MAIN',       sets: 1, reps: '5min',     restTime: '0',  duration: '5min' },
    { name: 'Posture du guerrier II',    category: 'MAIN',       sets: 1, reps: '5min',     restTime: '0',  duration: '5min' },
    { name: 'Posture de l\'arbre',       category: 'MAIN',       sets: 1, reps: '3min',     restTime: '0' },
    { name: 'Posture du chien tête en bas', category: 'MAIN',   sets: 2, reps: '2min',     restTime: '0' },
    { name: 'Torsion spinale',           category: 'STRETCHING', sets: 2, reps: '2min',     restTime: '0' },
    { name: 'Méditation assise',         category: 'STRETCHING', sets: 1, reps: '10min',    restTime: '0',  duration: '10min' },
  ],
  nutrition: [
    { name: 'Marche active',             category: 'CARDIO',     sets: 1, reps: '45min',  restTime: '0',  duration: '45min' },
    { name: 'Squats poids du corps',     category: 'MAIN',       sets: 3, reps: '15',     restTime: '1min' },
    { name: 'Pompes',                    category: 'MAIN',       sets: 3, reps: '10',     restTime: '1min' },
    { name: 'Vélo stationnaire',         category: 'CARDIO',     sets: 1, reps: '30min',  restTime: '0',  duration: '30min' },
    { name: 'Fentes avant',              category: 'MAIN',       sets: 3, reps: '12',     restTime: '1min' },
    { name: 'Étirements dos complet',    category: 'STRETCHING', sets: 2, reps: '1min',   restTime: '0' },
  ],
};

// ─── Génération des stats ─────────────────────────────────────────────────────

function buildStats(client, daysBack, clientIdx) {
  const isLoss   = client.weightTrend === 'loss';
  const isGain   = client.weightTrend === 'gain';
  const baseW    = client.weight ?? 70;

  // Tendance linéaire sur 90 jours : ±0.03 kg/jour
  const trendPerDay = isLoss ? -0.025 : isGain ? 0.018 : 0;
  const weight = round1(Math.max(40, baseW + trendPerDay * (90 - daysBack) + rand(-0.25, 0.25)));

  const calories = isLoss
    ? randInt(1400, 1850)
    : isGain
    ? randInt(2700, 3400)
    : randInt(1900, 2500);

  return {
    sleepHours:      round1(rand(5.5, 9.0)),
    waterIntake:     round1(rand(1.2, 3.2)),
    weight,
    totalCalories:   calories,
    workoutDuration: Math.random() > 0.35 ? randInt(30, 90) : null,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🌱  FitFlow Seed – démarrage');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── Nettoyage des comptes seed existants ──────────────────────────────────
  console.log('🧹 Nettoyage des données seed existantes...');
  const allSeedEmails = [
    ...COACHES.map(c => c.email),
    ...CLIENTS.map(c => c.email),
  ];
  // La suppression cascade depuis User → CoachProfile/ClientProfile → tout le reste
  const deleted = await prisma.user.deleteMany({
    where: { email: { in: allSeedEmails } },
  });
  console.log(`   ${deleted.count} compte(s) supprimé(s)\n`);

  const hashedPwd = await bcrypt.hash('123456', 10);

  // ── Créer les coachs ──────────────────────────────────────────────────────
  console.log('👔 Création des coachs...');
  const coachProfiles = [];

  for (const cd of COACHES) {
    const user = await prisma.user.create({
      data: {
        email:     cd.email,
        password:  hashedPwd,
        role:      'COACH',
        firstName: cd.firstName,
        lastName:  cd.lastName,
        coachProfile: {
          create: {
            bio:               cd.bio,
            experience:        cd.experience,
            city:              cd.city,
            isRemote:          cd.isRemote,
            rating:            round1(rand(4.1, 5.0)),
            ratingCount:       randInt(8, 45),
          },
        },
      },
      include: { coachProfile: true },
    });
    coachProfiles.push(user.coachProfile);
    console.log(`   ✓ ${cd.firstName} ${cd.lastName}  (${cd.email})`);
  }

  // ── Créer les clients, programmes, séances et stats ───────────────────────
  console.log('\n👥 Création des clients + données...\n');

  let totalStats    = 0;
  let totalSessions = 0;

  for (let i = 0; i < CLIENTS.length; i++) {
    const cd    = CLIENTS[i];
    const coach = coachProfiles[cd.coachIndex];
    const specialty = COACHES[cd.coachIndex].specialty;

    const birthDate = cd.birthYear
      ? new Date(cd.birthYear, randInt(0, 11), randInt(1, 28))
      : null;

    // Créer user + profil client
    const user = await prisma.user.create({
      data: {
        email:     cd.email,
        password:  hashedPwd,
        role:      'CLIENT',
        firstName: cd.firstName,
        lastName:  cd.lastName,
        birthDate,
        clientProfile: {
          create: {
            coachId:           coach.id,
            weight:            cd.weight,
            height:            cd.height,
            dateOfBirth:       birthDate,
            gender:            cd.gender,
            customGoal:        cd.goals,
            level:             cd.level === 'débutant' ? 'BEGINNER' : cd.level === 'intermédiaire' ? 'INTERMEDIATE' : cd.level === 'avancé' ? 'ADVANCED' : null,
            city:              COACHES[cd.coachIndex].city,
          },
        },
      },
      include: { clientProfile: true },
    });

    const profile = user.clientProfile;

    // Relation ClientCoach
    await prisma.clientCoach.create({
      data: {
        clientId:  profile.id,
        coachId:   coach.id,
        isPrimary: true,
        isActive:  true,
      },
    });

    // ── Programme ─────────────────────────────────────────────────────────
    const progStart = dayAt(90, 0);
    const program = await prisma.program.create({
      data: {
        coachId:              coach.id,
        clientId:             profile.id,
        title:                cd.program,
        description:          `Programme personnalisé — ${cd.goals}`,
        startDate:            progStart,
        isActive:             true,
        dietEnabled:          specialty === 'nutrition',
        dietType:             specialty === 'nutrition' ? 'calories' : null,
        targetCalories:       specialty === 'nutrition'
                                ? (cd.weight && cd.weight > 90 ? 1600 : 1900)
                                : null,
        waterTrackingEnabled: true,
        waterGoal:            2.5,
        sleepTrackingEnabled: true,
        weightTrackingEnabled: true,
      },
    });

    // ── Séances (3/semaine sur les 60 derniers jours) ─────────────────────
    const exList = EXERCISES[specialty];
    // 4 exercices par séance, tirés au sort dans la liste
    const pickExercises = () => {
      const shuffled = [...exList].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, Math.min(4, shuffled.length));
    };

    const sessionDayOffsets = [1, 3, 6]; // lundi-mercredi-samedi de chaque semaine
    const usedDates = new Set();

    for (let week = 0; week < 9; week++) {
      for (const offset of sessionDayOffsets) {
        const dAgo = 63 - week * 7 - offset;
        if (dAgo < 0) continue;

        const sessionDate = dayAt(dAgo, 0);
        const key = sessionDate.toISOString().split('T')[0];
        if (usedDates.has(key)) continue;
        usedDates.add(key);

        const isRest   = offset === 3 && week % 4 === 0;
        const isPast   = dAgo > 0;
        const exs      = isRest ? [] : pickExercises();

        await prisma.session.create({
          data: {
            programId: program.id,
            date:      sessionDate,
            status:    isPast && !isRest ? 'DONE' : 'EMPTY',
            isRestDay: isRest,
            notes:     isRest ? 'Récupération active' : null,
            exercises: exs.length > 0
              ? { create: exs.map((ex, order) => ({
                    name:     ex.name,
                    category: ex.category,
                    sets:     ex.sets,
                    reps:     ex.reps,
                    weight:   ex.weight ?? null,
                    restTime: ex.restTime,
                    duration: ex.duration ?? null,
                    order,
                  })) }
              : undefined,
          },
        });
        totalSessions++;
      }
    }

    // ── Stats quotidiennes (90 jours, 80% de remplissage) ─────────────────
    const statsRows = [];
    for (let day = 90; day >= 1; day--) {
      if (Math.random() > 0.80) continue; // ~80% des jours ont des stats
      const statDate = dayAt(day, i);     // i ms d'offset pour unicité @unique date
      const s = buildStats(cd, day, i);
      statsRows.push({
        clientId:        profile.id,
        date:            statDate,
        sleepHours:      s.sleepHours,
        waterIntake:     s.waterIntake,
        weight:          s.weight,
        totalCalories:   s.totalCalories,
        workoutDuration: s.workoutDuration,
      });
    }
    await prisma.dailyStat.createMany({ data: statsRows });
    totalStats += statsRows.length;

    const coachName = COACHES[cd.coachIndex].firstName;
    console.log(`   ✓ ${cd.firstName.padEnd(10)} ${cd.lastName.padEnd(12)}` +
      `  genre: ${(cd.gender ?? 'n/a').padEnd(7)}` +
      `  ${cd.birthYear ? new Date().getFullYear() - cd.birthYear + 'a' : 'n/a'}`.padEnd(5) +
      `  ${cd.weight ? cd.weight + 'kg' : 'n/a'}`.padEnd(7) +
      `  → ${coachName}` +
      `  (${statsRows.length} stats, ${[...usedDates].length} séances)`);
  }

  // ── Résumé ────────────────────────────────────────────────────────────────
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅  Seed terminée avec succès !');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  • 5 coachs créés`);
  console.log(`  • 30 clients créés (6 par coach)`);
  console.log(`  • 30 programmes actifs`);
  console.log(`  • ${totalSessions} séances avec exercices`);
  console.log(`  • ${totalStats} entrées de stats quotidiennes`);
  console.log(`  • Mot de passe universel : 123456`);
  console.log('');
  console.log('  👔 Coachs :');
  COACHES.forEach(c => console.log(`     ${c.email}`));
  console.log('');
  console.log('  👥 Clients (extrait) :');
  CLIENTS.slice(0, 5).forEach(c => console.log(`     ${c.email}`));
  console.log(`     ... et ${CLIENTS.length - 5} autres`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Erreur seed :', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
