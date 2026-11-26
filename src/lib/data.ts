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

export interface CampBreakdown {
  camp: Camp;
  decisionsByStatus: Record<(typeof STATUT_DECISIONS)[number], number>;
  decisionsByCategory: Record<Categorie, number>;
  ongoingByStatus: Record<(typeof STATUT_PROCEDURES_EN_COURS)[number], number>;
  ongoingByCategory: Record<Categorie, number>;
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
