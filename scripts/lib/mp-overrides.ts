/**
 * Manual corrections for MP records whose source data is corrupted.
 *
 * The data.govt.nz "member contact details" CSV mangles non-ASCII names: macron
 * vowels arrive as a literal "?" (e.g. "T?kuta", "M?ori") and characters such as
 * é/ö are lost to the Unicode replacement character during decoding
 * ("Men�ndez", "Chl�e"). Both are irrecoverable from the bytes, so we correct
 * them here, keyed on the (stable, ASCII) slug that the corrupted name produces.
 *
 * Each override supplies the correct display name and a clean slug/id so that
 * derived URLs (voted.nz profile and photo) line up with the real person.
 */
export interface MpOverride {
  /** Correct display name, with proper diacritics. */
  name: string;
  /** Clean, ASCII-folded id/slug used for routing, photos and profile links. */
  mpId: string;
}

/** Keyed by the slug generated from the corrupted source name. */
export const MP_OVERRIDES: Record<string, MpOverride> = {
  'ferris-t-kuta': { name: 'Tākuta Ferris', mpId: 'ferris-takuta' },
  'lyndon-h-hana': { name: 'Hōhana Lyndon', mpId: 'lyndon-hohana' },
  'men-ndez-march-ricardo': { name: 'Ricardo Menéndez March', mpId: 'menendez-march-ricardo' },
  'swarbrick-chl-e': { name: 'Chlöe Swarbrick', mpId: 'swarbrick-chloe' },
};
