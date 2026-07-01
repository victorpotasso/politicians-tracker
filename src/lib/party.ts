/**
 * Maps party-name variants (from the MP dataset and historical term data) onto
 * a single canonical display name, so a party isn't fragmented across pages.
 */
const PARTY_CANONICAL: Record<string, string> = {
  'United Future New Zealand': 'United Future',
};

/**
 * Fallback canonicalisation keyed on a letters-only fingerprint. This absorbs
 * diacritic/encoding variants — e.g. the MP dataset stores "Te Paati M?ori"
 * (a mangled macron) which must still resolve to Te Pāti Māori.
 */
const CANONICAL_BY_FINGERPRINT: Record<string, string> = {
  tepatimaori: 'Te Pāti Māori',
  tepaatimaori: 'Te Pāti Māori',
  tepaatimori: 'Te Pāti Māori',
  maoriparty: 'Te Pāti Māori',
  unitedfuturenewzealand: 'United Future',
};

function fingerprint(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();
}

export function canonicalParty(name: string): string {
  return PARTY_CANONICAL[name] ?? CANONICAL_BY_FINGERPRINT[fingerprint(name)] ?? name;
}

/** Canonical brand-ish colours for NZ parties, used for charts and accents. */
export const PARTY_COLORS: Record<string, string> = {
  National: '#00529f',
  Labour: '#d82c20',
  Green: '#098137',
  ACT: '#fdb713',
  'New Zealand First': '#4a4f57',
  'Te Pāti Māori': '#b2001a',
  // Historical (MMP-era) parties, for the Parliament composition view.
  'Māori Party': '#c8102e',
  'Mana Party': '#8a0000',
  Alliance: '#e0592b',
  Progressive: '#00a19a',
  'United Future': '#6b4fa0',
  'United New Zealand': '#8a76c0',
};

export const PARTY_FALLBACK = 'var(--chart-3)';

export function partyColor(party: string | null | undefined): string {
  if (!party) return PARTY_FALLBACK;
  return PARTY_COLORS[party] ?? PARTY_COLORS[canonicalParty(party)] ?? PARTY_FALLBACK;
}

/** URL-safe slug for a party (diacritics stripped), keyed on the canonical name. */
export function partySlug(party: string): string {
  return canonicalParty(party)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
