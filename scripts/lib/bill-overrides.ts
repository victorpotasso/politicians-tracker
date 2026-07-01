/**
 * Verified bill sponsors ("author" / member or minister in charge). The voted.nz
 * source does not expose who introduced each bill, so sponsors are supplied here
 * from authoritative Wikipedia infoboxes ("Introduced by"), keyed by the billId
 * that {@link slugify} produces from the bill title.
 *
 * Only bills whose sponsor has been directly verified are listed; others are
 * intentionally omitted rather than guessed. `mpId` is set only when the sponsor
 * is a current MP in the roster, so their profile can be linked.
 */
export interface BillSponsor {
  proponentName: string;
  party: string | null;
  /** Roster mpId when the sponsor is a current MP, else null. */
  proponentMpId: string | null;
}

export const BILL_SPONSORS: Record<string, BillSponsor> = {
  // Government bill — Minister of Justice (Sixth Labour Government).
  'abortion-legislation-bill': {
    proponentName: 'Andrew Little',
    party: 'Labour',
    proponentMpId: null,
  },
  // Member's bill — ACT leader; still in Parliament.
  'end-of-life-choice-bill': {
    proponentName: 'David Seymour',
    party: 'ACT',
    proponentMpId: 'seymour-david',
  },
  // Member's bill — Labour MP for Manurewa (no longer in Parliament).
  'marriage-definition-of-marriage-amendment-bill': {
    proponentName: 'Louisa Wall',
    party: 'Labour',
    proponentMpId: null,
  },
  // Member's bill — Green MP; distinct from David Clark's government bill of the
  // same era (note the "and Other Matters" title). Still in Parliament.
  'misuse-of-drugs-medicinal-cannabis-and-other-matters-amendment-bill': {
    proponentName: 'Chlöe Swarbrick',
    party: 'Green',
    proponentMpId: 'swarbrick-chloe',
  },
};
