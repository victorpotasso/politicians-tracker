import {
  slugify,
  toAmount,
  toExpenseCategory,
  toIsoDate,
  toParty,
  toVoteValue,
} from '../normalize';

describe('normalize', () => {
  describe('toIsoDate', () => {
    it('passes through ISO dates', () => {
      expect(toIsoDate('2025-03-12')).toBe('2025-03-12');
    });
    it('parses DD/MM/YYYY', () => {
      expect(toIsoDate('12/03/2025')).toBe('2025-03-12');
    });
    it('parses "12 March 2025"', () => {
      expect(toIsoDate('12 March 2025')).toBe('2025-03-12');
    });
    it('returns null for junk', () => {
      expect(toIsoDate('not a date')).toBeNull();
    });
  });

  describe('toAmount', () => {
    it('parses currency strings', () => {
      expect(toAmount('$1,234.50')).toBe(1234.5);
      expect(toAmount('NZ$ 12')).toBe(12);
    });
    it('returns null when empty', () => {
      expect(toAmount('')).toBeNull();
      expect(toAmount(null)).toBeNull();
    });
  });

  describe('toExpenseCategory', () => {
    it('maps to canonical categories', () => {
      expect(toExpenseCategory('Domestic flight')).toBe('travel');
      expect(toExpenseCategory('Hotel accommodation')).toBe('accommodation');
      expect(toExpenseCategory('Stationery')).toBe('other');
    });
  });

  describe('toVoteValue', () => {
    it('maps votes to canonical values', () => {
      expect(toVoteValue('Aye')).toBe('aye');
      expect(toVoteValue('Against')).toBe('nay');
      expect(toVoteValue('abstained')).toBe('absent');
    });
  });

  describe('toParty', () => {
    it('canonicalises party names', () => {
      expect(toParty('National Party')).toBe('National');
      expect(toParty('Green Party')).toBe('Green');
    });
  });

  describe('slugify', () => {
    it('produces url-safe ids', () => {
      expect(slugify('Abortion Legislation Bill')).toBe('abortion-legislation-bill');
    });
  });
});
