/** Canonical brand-ish colours for NZ parties, used for charts and accents. */
export const PARTY_COLORS: Record<string, string> = {
  National: '#00529f',
  Labour: '#d82c20',
  Green: '#098137',
  ACT: '#fdb713',
  'New Zealand First': '#111827',
  'Te Pāti Māori': '#b2001a',
};

export const PARTY_FALLBACK = 'var(--chart-3)';

export function partyColor(party: string | null | undefined): string {
  if (!party) return PARTY_FALLBACK;
  return PARTY_COLORS[party] ?? PARTY_FALLBACK;
}
