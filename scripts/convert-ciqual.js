// Script de conversion du fichier Excel Ciqual 2025 → JSON
// Usage : node scripts/convert-ciqual.js

import XLSX from 'xlsx';
const { readFile, utils } = XLSX;
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT = resolve(__dirname, 'ciqual_2025.xlsx');
const OUTPUT = resolve(__dirname, '..', 'prisma', 'data', 'ciqual.json');

// Indices des colonnes dans le fichier Excel Ciqual 2025
const COL = {
  groupName: 3,    // alim_grp_nom_fr
  code: 6,         // alim_code
  name: 7,         // alim_nom_fr
  energyKcal: 10,  // Energie, Règlement UE N° 1169/2011 (kcal/100g)
  proteins: 14,    // Protéines, N x facteur de Jones (g/100g)
  carbohydrates: 16, // Glucides (g/100g)
  fat: 17,         // Lipides (g/100g)
  sugars: 18,      // Sucres (g/100g)
  fiber: 26,       // Fibres alimentaires (g/100g)
  salt: 49,        // Sel chlorure de sodium (g/100g)
};

function parseNum(val) {
  if (val === undefined || val === null || val === '-' || val === 'traces' || val === '') return 0;
  const str = String(val).replace(',', '.').replace('<', '').trim();
  const n = parseFloat(str);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

const wb = readFile(INPUT);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = utils.sheet_to_json(ws, { header: 1 });

// Première ligne = headers, données à partir de la ligne 1
const foods = [];
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const code = String(r[COL.code] || '').trim();
  const name = String(r[COL.name] || '').trim();
  if (!code || !name) continue;

  foods.push({
    ciqualCode: code,
    name,
    groupName: r[COL.groupName] ? String(r[COL.groupName]).replace(/\r\n/g, ' ').trim() : null,
    energyKcal100g: parseNum(r[COL.energyKcal]),
    proteins100g: parseNum(r[COL.proteins]),
    carbohydrates100g: parseNum(r[COL.carbohydrates]),
    fat100g: parseNum(r[COL.fat]),
    fiber100g: parseNum(r[COL.fiber]),
    sugars100g: parseNum(r[COL.sugars]),
    salt100g: parseNum(r[COL.salt]),
  });
}

writeFileSync(OUTPUT, JSON.stringify(foods, null, 2), 'utf-8');
console.log(`✓ ${foods.length} aliments exportés vers ${OUTPUT}`);
