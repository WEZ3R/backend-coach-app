/**
 * Script de traduction des exercices EN → FR
 * Utilise MyMemory API (gratuit) pour les instructions
 * Dictionnaires locaux pour noms et muscles
 *
 * Usage : node prisma/translate-exercises.js
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

// ── Dictionnaire muscles ──
const muscleMap = {
  'abs': 'abdominaux',
  'abductors': 'abducteurs',
  'adductors': 'adducteurs',
  'biceps': 'biceps',
  'calves': 'mollets',
  'cardiovascular system': 'système cardiovasculaire',
  'delts': 'deltoïdes',
  'forearms': 'avant-bras',
  'glutes': 'fessiers',
  'hamstrings': 'ischio-jambiers',
  'hip flexors': 'fléchisseurs de hanche',
  'lats': 'dorsaux',
  'levator scapulae': 'élévateur de la scapula',
  'pectorals': 'pectoraux',
  'quads': 'quadriceps',
  'quadriceps': 'quadriceps',
  'serratus anterior': 'dentelé antérieur',
  'spine': 'colonne vertébrale',
  'traps': 'trapèzes',
  'triceps': 'triceps',
  'upper back': 'haut du dos',
  'shoulders': 'épaules',
  'chest': 'poitrine',
  'core': 'gainage',
  'groin': 'aine',
  'hip': 'hanche',
  'lower back': 'bas du dos',
  'neck': 'cou',
  'obliques': 'obliques',
  'rhomboids': 'rhomboïdes',
  'rotator cuff': 'coiffe des rotateurs',
  'shin': 'tibia',
  'soleus': 'soléaire',
  'tensor fasciae latae': 'tenseur du fascia lata',
  'tibialis anterior': 'tibial antérieur',
  'wrist flexors': 'fléchisseurs du poignet',
  'wrist extensors': 'extenseurs du poignet',
  'infraspinatus': 'infra-épineux',
  'teres major': 'grand rond',
  'teres minor': 'petit rond',
  'brachialis': 'brachial',
  'brachioradialis': 'brachio-radial',
  'anterior deltoid': 'deltoïde antérieur',
  'lateral deltoid': 'deltoïde latéral',
  'posterior deltoid': 'deltoïde postérieur',
  'pectineous': 'pectiné',
  'sartorius': 'couturier',
  'gastrocnemius': 'gastrocnémien',
  'plantaris': 'plantaire',
  'iliopsoas': 'ilio-psoas',
  'erector spinae': 'érecteurs du rachis',
  'gluteus medius': 'moyen fessier',
  'gluteus maximus': 'grand fessier',
  'gluteus minimus': 'petit fessier',
  'rectus abdominis': 'grand droit',
  'transverse abdominis': 'transverse',
  'internal obliques': 'obliques internes',
  'external obliques': 'obliques externes',
  'rectus femoris': 'droit fémoral',
  'vastus lateralis': 'vaste latéral',
  'vastus medialis': 'vaste médial',
  'vastus intermedius': 'vaste intermédiaire',
  'biceps brachii': 'biceps brachial',
  'triceps brachii': 'triceps brachial',
  'pectoralis major': 'grand pectoral',
  'pectoralis minor': 'petit pectoral',
  'latissimus dorsi': 'grand dorsal',
  'trapezius': 'trapèze',
  'sternocleidomastoid': 'sterno-cléido-mastoïdien',
  'deltoid': 'deltoïde',
  'supraspinatus': 'supra-épineux',
  'subscapularis': 'subscapulaire',
  'pronators': 'pronateurs',
  'supinator': 'supinateur',
  'wrist': 'poignet',
  'ankles': 'chevilles',
  'hands': 'mains',
  'fingers': 'doigts',
};

// ── Dictionnaire termes d'exercices (noms) ──
const exerciseTerms = {
  'push-up': 'pompe', 'push up': 'pompe', 'pushup': 'pompe',
  'pull-up': 'traction', 'pull up': 'traction', 'pullup': 'traction',
  'chin-up': 'traction supination', 'chin up': 'traction supination',
  'dip': 'dip', 'dips': 'dips',
  'squat': 'squat', 'squats': 'squats',
  'deadlift': 'soulevé de terre', 'deadlifts': 'soulevés de terre',
  'bench press': 'développé couché',
  'overhead press': 'développé militaire',
  'shoulder press': 'développé épaules',
  'military press': 'développé militaire',
  'chest press': 'développé poitrine',
  'leg press': 'presse à cuisses',
  'incline press': 'développé incliné',
  'decline press': 'développé décliné',
  'floor press': 'développé au sol',
  'close-grip press': 'développé prise serrée',
  'wide-grip press': 'développé prise large',
  'lunge': 'fente', 'lunges': 'fentes',
  'reverse lunge': 'fente arrière',
  'walking lunge': 'fente marchée',
  'lateral lunge': 'fente latérale',
  'curtsy lunge': 'fente croisée',
  'step-up': 'step-up', 'step up': 'step-up',
  'row': 'tirage', 'rows': 'tirages',
  'bent-over row': 'tirage buste penché',
  'upright row': 'tirage menton',
  'seated row': 'tirage assis',
  'cable row': 'tirage poulie',
  'curl': 'curl', 'curls': 'curls',
  'bicep curl': 'curl biceps',
  'hammer curl': 'curl marteau',
  'preacher curl': 'curl pupitre',
  'concentration curl': 'curl concentration',
  'reverse curl': 'curl inversé',
  'tricep extension': 'extension triceps',
  'triceps extension': 'extension triceps',
  'skull crusher': 'barre au front',
  'kickback': 'kickback',
  'fly': 'écarté', 'flye': 'écarté', 'flies': 'écartés', 'flyes': 'écartés',
  'chest fly': 'écarté poitrine',
  'reverse fly': 'écarté inversé',
  'lateral raise': 'élévation latérale',
  'front raise': 'élévation frontale',
  'rear delt raise': 'élévation deltoïde postérieur',
  'shrug': 'shrug', 'shrugs': 'shrugs',
  'crunch': 'crunch', 'crunches': 'crunchs',
  'sit-up': 'relevé de buste', 'sit up': 'relevé de buste',
  'plank': 'planche', 'planks': 'planches',
  'side plank': 'planche latérale',
  'reverse plank': 'planche inversée',
  'mountain climber': 'mountain climber', 'mountain climbers': 'mountain climbers',
  'burpee': 'burpee', 'burpees': 'burpees',
  'jumping jack': 'jumping jack', 'jumping jacks': 'jumping jacks',
  'leg raise': 'relevé de jambes',
  'leg curl': 'leg curl',
  'leg extension': 'extension de jambes',
  'calf raise': 'extension mollets',
  'hip thrust': 'hip thrust',
  'glute bridge': 'pont fessier',
  'good morning': 'good morning',
  'hyperextension': 'hyperextension',
  'back extension': 'extension du dos',
  'face pull': 'face pull',
  'pullover': 'pullover',
  'lat pulldown': 'tirage vertical',
  'pulldown': 'tirage vertical',
  'cable crossover': 'crossover poulie',
  'crossover': 'crossover',
  'press': 'développé',
  'raise': 'élévation',
  'extension': 'extension',
  'flexion': 'flexion',
  'rotation': 'rotation',
  'twist': 'rotation',
  'stretch': 'étirement',
  'hold': 'maintien',
  'walk': 'marche',
  'run': 'course',
  'sprint': 'sprint',
  'jump': 'saut',
  'hop': 'saut',
  'swing': 'swing',
  'snatch': 'arraché',
  'clean': 'épaulé',
  'clean and jerk': 'épaulé-jeté',
  'thruster': 'thruster',
  'wall ball': 'wall ball',
  'box jump': 'saut sur box',
  'rope climb': 'montée de corde',
  'battle rope': 'corde ondulatoire',
  'farmer walk': 'marche du fermier',
  'sled push': 'poussée de traîneau',
  'sled pull': 'tirage de traîneau',
  'turkish get-up': 'relevé turc',
  'barbell': 'barre', 'dumbbell': 'haltère', 'dumbbells': 'haltères',
  'kettlebell': 'kettlebell', 'cable': 'poulie',
  'machine': 'machine', 'band': 'élastique', 'bands': 'élastiques',
  'bodyweight': 'poids du corps', 'body weight': 'poids du corps',
  'medicine ball': 'médecine-ball', 'stability ball': 'swiss ball',
  'ez barbell': 'barre EZ', 'smith machine': 'smith machine',
  'roller': 'rouleau', 'foam roller': 'rouleau mousse',
  'bench': 'banc', 'chair': 'chaise', 'ball': 'ballon',
  'bar': 'barre', 'rope': 'corde', 'wheel': 'roue',
  'trap bar': 'trap bar', 'resistance band': 'bande de résistance',
  'seated': 'assis', 'standing': 'debout', 'lying': 'allongé',
  'incline': 'incliné', 'decline': 'décliné', 'flat': 'plat',
  'prone': 'ventral', 'supine': 'dorsal',
  'single leg': 'unilatéral jambe', 'single arm': 'unilatéral bras',
  'one arm': 'un bras', 'one leg': 'une jambe',
  'alternate': 'alterné', 'alternating': 'alterné',
  'assisted': 'assisté', 'weighted': 'lesté',
  'wide grip': 'prise large', 'close grip': 'prise serrée',
  'narrow grip': 'prise serrée', 'neutral grip': 'prise neutre',
  'overhand': 'pronation', 'underhand': 'supination',
  'reverse': 'inversé', 'isometric': 'isométrique',
  'explosive': 'explosif', 'slow': 'lent',
  'elevated': 'surélevé', 'suspended': 'suspendu',
  'kneeling': 'à genoux', 'half kneeling': 'semi-agenouillé',
  'chest': 'poitrine', 'back': 'dos', 'shoulder': 'épaule', 'shoulders': 'épaules',
  'arm': 'bras', 'arms': 'bras', 'leg': 'jambe', 'legs': 'jambes',
  'upper body': 'haut du corps', 'lower body': 'bas du corps',
  'full body': 'corps complet', 'core': 'gainage',
  'glute': 'fessier', 'glutes': 'fessiers',
  'hamstring': 'ischio-jambier', 'hamstrings': 'ischio-jambiers',
  'quad': 'quadriceps', 'quads': 'quadriceps',
  'calf': 'mollet', 'calves': 'mollets',
  'hip': 'hanche', 'hips': 'hanches',
  'knee': 'genou', 'knees': 'genoux',
  'ankle': 'cheville', 'ankles': 'chevilles',
  'wrist': 'poignet', 'wrists': 'poignets',
  'elbow': 'coude', 'elbows': 'coudes',
  'forearm': 'avant-bras', 'forearms': 'avant-bras',
  'tricep': 'triceps', 'triceps': 'triceps',
  'bicep': 'biceps', 'biceps': 'biceps',
  'neck': 'cou', 'spine': 'colonne',
  'abs': 'abdominaux', 'abdominal': 'abdominal',
  'oblique': 'oblique', 'obliques': 'obliques',
  'thigh': 'cuisse', 'thighs': 'cuisses',
  'shin': 'tibia', 'shins': 'tibias',
  'toe': 'orteil', 'toes': 'orteils',
  'heel': 'talon', 'heels': 'talons',
  'foot': 'pied', 'feet': 'pieds',
  'hand': 'main', 'hands': 'mains',
  'finger': 'doigt', 'fingers': 'doigts',
  'palm': 'paume', 'palms': 'paumes',
};

// ── API MyMemory ──
const SEPARATOR = ' ||| ';
const MAX_CHARS = 4500;
const RATE_LIMIT_MS = 1100; // ~1 requête/seconde pour éviter le rate limit

async function translateWithAPI(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|fr&de=fitflow.translate@gmail.com`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  const data = await res.json();
  if (data.responseStatus === 429) throw new Error('RATE_LIMIT');
  return data.responseData?.translatedText || text;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Traduit un batch d'instructions via API
 * Concatène les instructions avec un séparateur, envoie en une requête, puis re-sépare
 */
async function translateInstructionsBatch(instructions) {
  if (!instructions.length) return [];

  // Nettoyer les préfixes Step:N
  const cleaned = instructions.map(inst => {
    return inst.replace(/^Step:\d+\s*/, '').trim();
  });

  // Créer des sous-batches qui respectent la limite de caractères
  const subBatches = [];
  let current = [];
  let currentLen = 0;

  for (const text of cleaned) {
    if (currentLen + text.length + SEPARATOR.length > MAX_CHARS && current.length > 0) {
      subBatches.push(current);
      current = [];
      currentLen = 0;
    }
    current.push(text);
    currentLen += text.length + SEPARATOR.length;
  }
  if (current.length > 0) subBatches.push(current);

  // Traduire chaque sous-batch
  const allTranslated = [];
  for (const batch of subBatches) {
    const combined = batch.join(SEPARATOR);
    await sleep(RATE_LIMIT_MS);
    const translated = await translateWithAPI(combined);
    // Re-séparer (MyMemory garde les séparateurs)
    const parts = translated.split(/\s*\|\|\|\s*/);
    allTranslated.push(...parts);
  }

  // Remettre les préfixes "Étape N :"
  return allTranslated.map((text, i) => {
    const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
    return `Étape ${i + 1} : ${capitalized}`;
  });
}

function translateName(name) {
  let translated = name.toLowerCase();
  const sortedTerms = Object.entries(exerciseTerms)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [en, fr] of sortedTerms) {
    const regex = new RegExp(`\\b${en.replace(/[-/]/g, '[-/ ]?')}\\b`, 'gi');
    translated = translated.replace(regex, fr);
  }
  return translated.charAt(0).toUpperCase() + translated.slice(1);
}

function translateMuscles(muscles) {
  return muscles.map(m => muscleMap[m.toLowerCase()] || m);
}

async function translate() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  🇫🇷  Traduction des exercices EN → FR');
  console.log('  📡  API MyMemory pour les instructions');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const exercises = await prisma.exerciseReference.findMany();
  console.log(`📦 ${exercises.length} exercices à traduire\n`);

  let updated = 0;
  let errors = 0;
  const startTime = Date.now();

  for (const ex of exercises) {
    try {
      const translatedName = translateName(ex.name);
      const translatedTarget = translateMuscles(ex.targetMuscles);
      const translatedSecondary = translateMuscles(ex.secondaryMuscles);
      const translatedInstructions = await translateInstructionsBatch(ex.instructions);

      await prisma.exerciseReference.update({
        where: { id: ex.id },
        data: {
          name: translatedName,
          targetMuscles: translatedTarget,
          secondaryMuscles: translatedSecondary,
          instructions: translatedInstructions,
        },
      });
      updated++;
    } catch (error) {
      if (error.message === 'RATE_LIMIT') {
        console.log('\n  ⏳ Rate limit atteint, pause 10s...');
        await sleep(10000);
        // Retry
        try {
          const translatedName = translateName(ex.name);
          const translatedTarget = translateMuscles(ex.targetMuscles);
          const translatedSecondary = translateMuscles(ex.secondaryMuscles);
          const translatedInstructions = await translateInstructionsBatch(ex.instructions);
          await prisma.exerciseReference.update({
            where: { id: ex.id },
            data: {
              name: translatedName,
              targetMuscles: translatedTarget,
              secondaryMuscles: translatedSecondary,
              instructions: translatedInstructions,
            },
          });
          updated++;
        } catch (retryErr) {
          console.error(`  ❌ ${ex.name} (retry) : ${retryErr.message}`);
          errors++;
        }
      } else {
        console.error(`  ❌ ${ex.name} : ${error.message}`);
        errors++;
      }
    }

    const total = updated + errors;
    if (total % 10 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const eta = (((Date.now() - startTime) / total) * (exercises.length - total) / 1000 / 60).toFixed(1);
      process.stdout.write(`  ${total}/${exercises.length} (${elapsed}s écoulées, ~${eta}min restantes)   \r`);
    }
  }

  console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  ✅  Traduction terminée !`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  • ${updated} exercices traduits`);
  console.log(`  • ${errors} erreurs`);
  console.log(`  • Durée : ${((Date.now() - startTime) / 1000 / 60).toFixed(1)} minutes\n`);
}

translate()
  .catch((error) => {
    console.error('\n❌ Erreur :', error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
