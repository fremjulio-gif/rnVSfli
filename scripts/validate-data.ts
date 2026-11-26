import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { DatasetSchema } from '../src/lib/schema.ts';

const dataPath = path.resolve(process.cwd(), 'data/cases.yaml');

if (!fs.existsSync(dataPath)) {
  console.error(`[validate-data] Fichier introuvable: ${dataPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(dataPath, 'utf-8');
const parsed = yaml.load(raw);

const result = DatasetSchema.safeParse(parsed);

if (!result.success) {
  console.error('[validate-data] Échec de validation du dataset:');
  for (const issue of result.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const dataset = result.data;
const rnCount = dataset.cases.filter((c) => c.camp === 'RN').length;
const lfiCount = dataset.cases.filter((c) => c.camp === 'LFI').length;
const primaryConfirmed = dataset.cases.filter(
  (c) => c.confirmation_primaire === 'confirme',
).length;

console.log(
  `[validate-data] OK — ${dataset.cases.length} fiches valides (RN: ${rnCount}, LFI: ${lfiCount}), ${primaryConfirmed} confirmées par source primaire directe, référence ${dataset.reference_date}.`,
);
