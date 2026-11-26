import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {
  CAMP_VALUES,
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

export interface PartyProfile {
  camp: Camp;
  shortName: string;
  fullName: string;
  former: string;
  figureName: string;
  figureRole: string;
  image: string;
  credit: string;
  license: string;
  sourcePage: string;
}

export const PARTIES_ROSTER: readonly PartyProfile[] = [
  {
    camp: 'LFI',
    shortName: 'LFI',
    fullName: 'La France insoumise',
    former: 'LFI / ex-Front de Gauche (2010–2026)',
    figureName: 'Jean-Luc Mélenchon',
    figureRole: 'Fondateur LFI · Figure du bloc',
    image: '/fighters/melenchon.png',
    credit: 'jlm2017.fr (mai 2026)',
    license: 'CC BY 4.0',
    sourcePage:
      'https://commons.wikimedia.org/wiki/File:Jean_Luc_M%C3%A9lenchon_en_mai_2026-_55261894422_(cropped).jpg',
  },
  {
    camp: 'RN',
    shortName: 'RN',
    fullName: 'Rassemblement National',
    former: 'RN / ex-Front National (2010–2026)',
    figureName: 'Marine Le Pen',
    figureRole: 'Ex-présidente FN/RN · Figure du bloc',
    image: '/fighters/lepen.png',
    credit: 'Vox España (2025)',
    license: 'CC0 1.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Marine_Le_Pen_2025_(cropped).jpg',
  },
  {
    camp: 'LR',
    shortName: 'LR',
    fullName: 'Les Républicains',
    former: 'LR / ex-UMP (2010–2026)',
    figureName: 'Bruno Retailleau',
    figureRole: 'Président de LR · Figure du bloc',
    image: '/fighters/retailleau.png',
    credit: 'Anthonymontardyfr',
    license: 'CC BY 4.0',
    sourcePage:
      'https://commons.wikimedia.org/wiki/File:Bruno_Retailleau_-_Ministre_de_l%27Int%C3%A9rieur_fran%C3%A7ais.jpg',
  },
  {
    camp: 'CENTRE',
    shortName: 'Centre',
    fullName: 'Centre / Macronistes',
    former: 'Renaissance (ex-LREM), MoDem, Horizons',
    figureName: 'Emmanuel Macron',
    figureRole: 'Fondateur de la majorité · Figure du bloc',
    image: '/fighters/macron.png',
    credit: 'Presidencia de la República del Ecuador (2024)',
    license: 'CC0 1.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Emmanuel_Macron_May_2024.jpg',
  },
  {
    camp: 'PS',
    shortName: 'PS',
    fullName: 'Parti socialiste',
    former: 'Parti socialiste (2010–2026)',
    figureName: 'Olivier Faure',
    figureRole: 'Premier secrétaire du PS · Figure du bloc',
    image: '/fighters/faure.png',
    credit: 'Olivier Faure (Wikimedia Commons)',
    license: 'CC BY-SA 2.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Portrait_d%27Olivier_Faure.jpg',
  },
  {
    camp: 'ECOLO',
    shortName: 'Écologistes',
    fullName: 'Les Écologistes',
    former: 'Les Écologistes / ex-EELV (2010–2026)',
    figureName: 'Marine Tondelier',
    figureRole: 'Secrétaire nationale · Figure du bloc',
    image: '/fighters/tondelier.png',
    credit: 'Selbymay (2023)',
    license: 'CC BY 4.0',
    sourcePage: 'https://commons.wikimedia.org/wiki/File:Huma2023MarineTondelier.jpg',
  },
] as const;

export const PARTIES_BY_CAMP: Record<Camp, PartyProfile> = Object.fromEntries(
  PARTIES_ROSTER.map((p) => [p.camp, p]),
) as Record<Camp, PartyProfile>;

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

export function computeAllCampMetrics(cases: JudicialCase[]): Record<Camp, CampMetrics> {
  return Object.fromEntries(
    CAMP_VALUES.map((camp) => [camp, computeCampMetrics(cases, camp)]),
  ) as Record<Camp, CampMetrics>;
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
  const campInfo = PARTIES_BY_CAMP[item.camp].fullName;
  const precise = item.parti_precis ? ` — ${item.parti_precis}` : '';
  const title = `[Correction] ${item.id} — ${item.titre}`;
  const body = [
    `**Fiche concernée :** \`${item.id}\` (${campInfo}${precise})`,
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
