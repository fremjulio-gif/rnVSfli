import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {
  CATEGORIE_VALUES,
  DatasetSchema,
  STATUT_DECISIONS,
  STATUT_PROCEDURES_EN_COURS,
  type Camp,
  type Categorie,
  type JudicialCase,
  type JudicialDataset,
  type Statut,
} from './schema';

let cachedDataset: JudicialDataset | null = null;

export function loadDataset(): JudicialDataset {
  if (cachedDataset) return cachedDataset;
  const filePath = path.resolve(process.cwd(), 'data/cases.yaml');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = yaml.load(raw);
  cachedDataset = DatasetSchema.parse(parsed);
  return cachedDataset;
}

export interface FighterProfile {
  slug: string;
  camp: Camp;
  name: string;
  shortName: string;
  role: string;
  isLeader: boolean;
  image: string;
  credit: string;
  license: string;
  sourcePage: string;
}

export const FIGHTERS_ROSTER: readonly FighterProfile[] = [
  {
    slug: 'melenchon',
    camp: 'LFI',
    name: 'Jean-Luc Mélenchon',
    shortName: 'J.-L. MÉLENCHON',
    role: 'Fondateur LFI · Ex-député / Ex-eurodéputé',
    isLeader: true,
    image: '/fighters/melenchon.png',
    credit: 'jlm2017.fr (mai 2026)',
    license: 'CC BY 4.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Jean_Luc_M%C3%A9lenchon_en_mai_2026-_55261894422_(cropped).jpg',
  },
  {
    slug: 'chikirou',
    camp: 'LFI',
    name: 'Sophia Chikirou',
    shortName: 'S. CHIKIROU',
    role: 'Députée LFI de Paris',
    isLeader: false,
    image: '/fighters/chikirou.png',
    credit: 'Wikimedia Commons',
    license: 'CC0 1.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Sophia-Chikirou.jpg',
  },
  {
    slug: 'bompard',
    camp: 'LFI',
    name: 'Manuel Bompard',
    shortName: 'M. BOMPARD',
    role: 'Député LFI · Coordinateur',
    isLeader: false,
    image: '/fighters/bompard.png',
    credit: 'Wikimedia Commons',
    license: 'CC0 1.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Manuel_Bompard_Manifestation_Liban_(cropped).jpg',
  },
  {
    slug: 'panot',
    camp: 'LFI',
    name: 'Mathilde Panot',
    shortName: 'M. PANOT',
    role: 'Présidente groupe LFI',
    isLeader: false,
    image: '/fighters/panot.png',
    credit: 'Antoine Stouls',
    license: 'CC BY 4.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Mathilde_Panot_2021-3.jpg',
  },
  {
    slug: 'lepen',
    camp: 'RN',
    name: 'Marine Le Pen',
    shortName: 'M. LE PEN',
    role: 'Ex-présidente FN/RN · Députée',
    isLeader: true,
    image: '/fighters/lepen.png',
    credit: 'Vox España (2025)',
    license: 'CC0 1.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Marine_Le_Pen_2025_(cropped).jpg',
  },
  {
    slug: 'aliot',
    camp: 'RN',
    name: 'Louis Aliot',
    shortName: 'L. ALIOT',
    role: 'Vice-président RN · Ex-eurodéputé',
    isLeader: false,
    image: '/fighters/aliot.png',
    credit: 'Pablo029',
    license: 'CC BY-SA 4.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Louis_Aliot_2015_02_(cropped)_(cropped).jpg',
  },
  {
    slug: 'odoul',
    camp: 'RN',
    name: 'Julien Odoul',
    shortName: 'J. ODOUL',
    role: 'Député RN de l’Yonne',
    isLeader: false,
    image: '/fighters/odoul.png',
    credit: 'SamothraceV',
    license: 'CC0 1.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Photo_officielle_Julien_Odoul.jpg',
  },
  {
    slug: 'jacobelli',
    camp: 'RN',
    name: 'Laurent Jacobelli',
    shortName: 'L. JACOBELLI',
    role: 'Député RN de la Moselle',
    isLeader: false,
    image: '/fighters/jacobelli.png',
    credit: 'Debout la France',
    license: 'CC BY-SA 2.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Laurent_Jacobelli.jpg',
  },
] as const;

export interface CampBreakdown {
  camp: Camp;
  decisionsByStatus: Record<(typeof STATUT_DECISIONS)[number], number>;
  decisionsByCategory: Record<Categorie, number>;
  ongoingByStatus: Record<(typeof STATUT_PROCEDURES_EN_COURS)[number], number>;
  ongoingByCategory: Record<Categorie, number>;
}

export interface CampMetrics {
  camp: Camp;
  totalCases: number;
  decisionsCount: number;
  definitiveConvictions: number;
  definitivePct: number;
  pendingConvictions: number;
  pendingPct: number;
  clearedCount: number;
  clearedPct: number;
  ongoingCount: number;
  ongoingPct: number;
  moraleInvolvedCount: number;
  physiqueOnlyCount: number;
  byCategoryAll: Record<Categorie, number>;
}

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export function computeCampMetrics(cases: JudicialCase[], camp: Camp): CampMetrics {
  const list = cases.filter((c) => c.camp === camp);
  const totalCases = list.length;
  const decisionsCount = list.filter((c) => c.section === 'decisions').length;
  const definitiveConvictions = list.filter(
    (c) => c.statut === 'condamnation_definitive',
  ).length;
  const pendingConvictions = list.filter(
    (c) => c.statut === 'condamne_premiere_instance' || c.statut === 'condamne_appel',
  ).length;
  const clearedCount = list.filter(
    (c) => c.statut === 'relaxe' || c.statut === 'non_lieu' || c.statut === 'prescription',
  ).length;
  const ongoingCount = list.filter((c) => c.section === 'procedures_en_cours').length;

  const moraleInvolvedCount = list.filter(
    (c) => c.type_entite === 'personne_morale' || c.type_entite === 'personne_morale_et_physique',
  ).length;
  const physiqueOnlyCount = list.filter(
    (c) => c.type_entite === 'personne_physique',
  ).length;

  const byCategoryAll = Object.fromEntries(
    CATEGORIE_VALUES.map((cat) => [cat, list.filter((c) => c.categorie === cat).length]),
  ) as Record<Categorie, number>;

  return {
    camp,
    totalCases,
    decisionsCount,
    definitiveConvictions,
    definitivePct: pct(definitiveConvictions, totalCases),
    pendingConvictions,
    pendingPct: pct(pendingConvictions, totalCases),
    clearedCount,
    clearedPct: pct(clearedCount, totalCases),
    ongoingCount,
    ongoingPct: pct(ongoingCount, totalCases),
    moraleInvolvedCount,
    physiqueOnlyCount,
    byCategoryAll,
  };
}

export function computeBreakdown(cases: JudicialCase[], camp: Camp): CampBreakdown {
  const campCases = cases.filter((c) => c.camp === camp);
  const decisions = campCases.filter((c) => c.section === 'decisions');
  const ongoing = campCases.filter((c) => c.section === 'procedures_en_cours');

  const decisionsByStatus = Object.fromEntries(
    STATUT_DECISIONS.map((s) => [s, decisions.filter((c) => c.statut === s).length]),
  ) as Record<(typeof STATUT_DECISIONS)[number], number>;

  const decisionsByCategory = Object.fromEntries(
    CATEGORIE_VALUES.map((cat) => [cat, decisions.filter((c) => c.categorie === cat).length]),
  ) as Record<Categorie, number>;

  const ongoingByStatus = Object.fromEntries(
    STATUT_PROCEDURES_EN_COURS.map((s) => [s, ongoing.filter((c) => c.statut === s).length]),
  ) as Record<(typeof STATUT_PROCEDURES_EN_COURS)[number], number>;

  const ongoingByCategory = Object.fromEntries(
    CATEGORIE_VALUES.map((cat) => [cat, ongoing.filter((c) => c.categorie === cat).length]),
  ) as Record<Categorie, number>;

  return {
    camp,
    decisionsByStatus,
    decisionsByCategory,
    ongoingByStatus,
    ongoingByCategory,
  };
}

export function buildIssueReportUrl(item: JudicialCase, repoIssuesUrl: string): string {
  const title = `[Correction] ${item.id} — ${item.titre}`;
  const body = [
    `**Fiche concernée :** \`${item.id}\` (${item.camp})`,
    `**Dernière vérification affichée :** ${item.verified_at}`,
    '',
    '**Erreur constatée / précision factuelle :**',
    '',
    '**Source primaire ou presse de référence à l’appui :**',
    '',
  ].join('\n');

  const params = new URLSearchParams({
    title,
    body,
    labels: 'correction-factuelle',
  });
  return `${repoIssuesUrl}?${params.toString()}`;
}

export function sortCasesByRecentDate(cases: JudicialCase[]): JudicialCase[] {
  return [...cases].sort((a, b) =>
    b.date_derniere_decision.localeCompare(a.date_derniere_decision),
  );
}

export function getStatusOrder(): readonly Statut[] {
  return [...STATUT_DECISIONS, ...STATUT_PROCEDURES_EN_COURS];
}
