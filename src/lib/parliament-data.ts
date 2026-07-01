/**
 * Curated historical composition of the New Zealand Parliament across the
 * MMP era (1996 onward). Seat counts reflect the make-up of each Parliament
 * as returned by the corresponding general election (final results).
 *
 * This is public historical data. It is intentionally kept as a plain module
 * (not `server-only`) so the interactive client chart can filter across terms
 * without a network round-trip.
 */

export interface PartySeats {
  party: string;
  seats: number;
}

export interface ParliamentTerm {
  /** Election year that produced this Parliament. */
  year: number;
  /** Ordinal number of the Parliament (e.g. 54 = 54th Parliament). */
  parliament: number;
  /** Total seats in the House for this term (may include overhang seats). */
  totalSeats: number;
  /** Parties that formed the government (coalition and/or confidence-and-supply). */
  government: string[];
  /** Prime Minister who led the government for most of the term. */
  primeMinister: string;
  /** Party of the Prime Minister. */
  pmParty: string;
  /** Short human-readable note about the government arrangement. */
  note: string;
  /** Party seat counts, ordered by descending seats. */
  parties: PartySeats[];
}

/**
 * Left-to-right political-spectrum ordering used to lay parties out along the
 * hemicycle. Parties not listed fall to the centre.
 */
export const PARTY_SPECTRUM: string[] = [
  'Green',
  'Mana Party',
  'Te Pāti Māori',
  'Māori Party',
  'Alliance',
  'Labour',
  'Progressive',
  'United Future',
  'United New Zealand',
  'New Zealand First',
  'National',
  'ACT',
];

export const PARLIAMENT_TERMS: ParliamentTerm[] = [
  {
    year: 1996,
    parliament: 45,
    totalSeats: 120,
    government: ['National', 'New Zealand First'],
    primeMinister: 'Jim Bolger',
    pmParty: 'National',
    note: 'National–NZ First coalition, the first government under MMP.',
    parties: [
      { party: 'National', seats: 44 },
      { party: 'Labour', seats: 37 },
      { party: 'New Zealand First', seats: 17 },
      { party: 'Alliance', seats: 13 },
      { party: 'ACT', seats: 8 },
      { party: 'United New Zealand', seats: 1 },
    ],
  },
  {
    year: 1999,
    parliament: 46,
    totalSeats: 120,
    government: ['Labour', 'Alliance'],
    primeMinister: 'Helen Clark',
    pmParty: 'Labour',
    note: 'Labour–Alliance coalition led by Helen Clark.',
    parties: [
      { party: 'Labour', seats: 49 },
      { party: 'National', seats: 39 },
      { party: 'Alliance', seats: 10 },
      { party: 'ACT', seats: 9 },
      { party: 'Green', seats: 7 },
      { party: 'New Zealand First', seats: 5 },
      { party: 'United New Zealand', seats: 1 },
    ],
  },
  {
    year: 2002,
    parliament: 47,
    totalSeats: 120,
    government: ['Labour', 'Progressive'],
    primeMinister: 'Helen Clark',
    pmParty: 'Labour',
    note: 'Labour–Progressive coalition with United Future confidence and supply.',
    parties: [
      { party: 'Labour', seats: 52 },
      { party: 'National', seats: 27 },
      { party: 'New Zealand First', seats: 13 },
      { party: 'ACT', seats: 9 },
      { party: 'Green', seats: 9 },
      { party: 'United Future', seats: 8 },
      { party: 'Progressive', seats: 2 },
    ],
  },
  {
    year: 2005,
    parliament: 48,
    totalSeats: 121,
    government: ['Labour', 'Progressive'],
    primeMinister: 'Helen Clark',
    pmParty: 'Labour',
    note: 'Labour-led government with NZ First and United Future confidence and supply.',
    parties: [
      { party: 'Labour', seats: 50 },
      { party: 'National', seats: 48 },
      { party: 'New Zealand First', seats: 7 },
      { party: 'Green', seats: 6 },
      { party: 'Māori Party', seats: 4 },
      { party: 'United Future', seats: 3 },
      { party: 'ACT', seats: 2 },
      { party: 'Progressive', seats: 1 },
    ],
  },
  {
    year: 2008,
    parliament: 49,
    totalSeats: 122,
    government: ['National', 'ACT', 'Māori Party', 'United Future'],
    primeMinister: 'John Key',
    pmParty: 'National',
    note: 'National-led government with ACT, the Māori Party and United Future.',
    parties: [
      { party: 'National', seats: 58 },
      { party: 'Labour', seats: 43 },
      { party: 'Green', seats: 9 },
      { party: 'ACT', seats: 5 },
      { party: 'Māori Party', seats: 5 },
      { party: 'Progressive', seats: 1 },
      { party: 'United Future', seats: 1 },
    ],
  },
  {
    year: 2011,
    parliament: 50,
    totalSeats: 121,
    government: ['National', 'ACT', 'Māori Party', 'United Future'],
    primeMinister: 'John Key',
    pmParty: 'National',
    note: 'National-led government with ACT, the Māori Party and United Future.',
    parties: [
      { party: 'National', seats: 59 },
      { party: 'Labour', seats: 34 },
      { party: 'Green', seats: 14 },
      { party: 'New Zealand First', seats: 8 },
      { party: 'Māori Party', seats: 3 },
      { party: 'Mana Party', seats: 1 },
      { party: 'ACT', seats: 1 },
      { party: 'United Future', seats: 1 },
    ],
  },
  {
    year: 2014,
    parliament: 51,
    totalSeats: 121,
    government: ['National', 'ACT', 'Māori Party', 'United Future'],
    primeMinister: 'John Key',
    pmParty: 'National',
    note: 'National-led government with ACT, the Māori Party and United Future.',
    parties: [
      { party: 'National', seats: 60 },
      { party: 'Labour', seats: 32 },
      { party: 'Green', seats: 14 },
      { party: 'New Zealand First', seats: 11 },
      { party: 'Māori Party', seats: 2 },
      { party: 'ACT', seats: 1 },
      { party: 'United Future', seats: 1 },
    ],
  },
  {
    year: 2017,
    parliament: 52,
    totalSeats: 120,
    government: ['Labour', 'New Zealand First'],
    primeMinister: 'Jacinda Ardern',
    pmParty: 'Labour',
    note: 'Labour–NZ First coalition with Green confidence and supply.',
    parties: [
      { party: 'National', seats: 56 },
      { party: 'Labour', seats: 46 },
      { party: 'New Zealand First', seats: 9 },
      { party: 'Green', seats: 8 },
      { party: 'ACT', seats: 1 },
    ],
  },
  {
    year: 2020,
    parliament: 53,
    totalSeats: 120,
    government: ['Labour'],
    primeMinister: 'Jacinda Ardern',
    pmParty: 'Labour',
    note: 'First single-party majority government of the MMP era.',
    parties: [
      { party: 'Labour', seats: 65 },
      { party: 'National', seats: 33 },
      { party: 'Green', seats: 10 },
      { party: 'ACT', seats: 10 },
      { party: 'Māori Party', seats: 2 },
    ],
  },
  {
    year: 2023,
    parliament: 54,
    totalSeats: 123,
    government: ['National', 'ACT', 'New Zealand First'],
    primeMinister: 'Christopher Luxon',
    pmParty: 'National',
    note: 'National–ACT–NZ First coalition (includes the Port Waikato by-election seat).',
    parties: [
      { party: 'National', seats: 49 },
      { party: 'Labour', seats: 34 },
      { party: 'Green', seats: 15 },
      { party: 'ACT', seats: 11 },
      { party: 'New Zealand First', seats: 8 },
      { party: 'Te Pāti Māori', seats: 6 },
    ],
  },
];

/** Majority threshold (seats needed to command the House). */
export function majorityThreshold(totalSeats: number): number {
  return Math.floor(totalSeats / 2) + 1;
}

/** Total seats held by the governing parties in a term. */
export function governmentSeats(term: ParliamentTerm): number {
  return term.parties
    .filter((p) => term.government.includes(p.party))
    .reduce((sum, p) => sum + p.seats, 0);
}

/** Order a term's parties along the political spectrum (left → right). */
export function orderBySpectrum(parties: PartySeats[]): PartySeats[] {
  return [...parties].sort((a, b) => {
    const ai = PARTY_SPECTRUM.indexOf(a.party);
    const bi = PARTY_SPECTRUM.indexOf(b.party);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}
