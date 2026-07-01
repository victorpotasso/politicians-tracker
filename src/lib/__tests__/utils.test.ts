import {
  formatDayMonthYear,
  formatPeriodRange,
  formatQuarterFull,
  formatQuarterLong,
  formatQuarterShort,
} from '../utils';

describe('quarter formatters', () => {
  it('formatQuarterShort renders a compact axis label', () => {
    expect(formatQuarterShort('2025-Q4')).toBe("Q4 '25");
    expect(formatQuarterShort('2024-Q1')).toBe("Q1 '24");
  });

  it('formatQuarterLong renders a readable month range', () => {
    expect(formatQuarterLong('2025-Q4')).toBe('Oct–Dec 2025');
    expect(formatQuarterLong('2024-Q1')).toBe('Jan–Mar 2024');
    expect(formatQuarterLong('2024-Q2')).toBe('Apr–Jun 2024');
    expect(formatQuarterLong('2024-Q3')).toBe('Jul–Sep 2024');
  });

  it('formatQuarterFull renders `QN YYYY`', () => {
    expect(formatQuarterFull('2025-Q4')).toBe('Q4 2025');
  });

  it('returns the raw input for non-quarter strings', () => {
    expect(formatQuarterShort('2025-06')).toBe('2025-06');
    expect(formatQuarterLong('not-a-period')).toBe('not-a-period');
  });
});

describe('formatPeriodRange', () => {
  it('joins distinct first and last periods', () => {
    expect(formatPeriodRange('2024-Q1', '2025-Q4')).toBe('Q1 2024 – Q4 2025');
  });

  it('collapses a single-period range', () => {
    expect(formatPeriodRange('2025-Q4', '2025-Q4')).toBe('Q4 2025');
  });

  it('handles missing bounds', () => {
    expect(formatPeriodRange(null, null)).toBe('—');
    expect(formatPeriodRange('2025-Q1', null)).toBe('—');
  });
});

describe('formatDayMonthYear', () => {
  it('formats ISO dates deterministically', () => {
    expect(formatDayMonthYear('2026-07-01')).toBe('1 Jul 2026');
  });

  it('returns an em dash for null', () => {
    expect(formatDayMonthYear(null)).toBe('—');
  });
});
