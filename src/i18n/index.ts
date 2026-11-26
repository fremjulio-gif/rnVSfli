import fr from './fr.json';

export type Locale = 'fr';
const dictionaries = { fr } as const;

export function getDict(locale: Locale = 'fr') {
  return dictionaries[locale];
}

export function formatDateFr(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
