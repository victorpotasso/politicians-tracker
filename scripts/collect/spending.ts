import ExcelJS from 'exceljs';

import type { SpendingCategory, SpendingYear } from '../../src/types/records';
import { fetchToCache } from '../lib/fetch-cache';
import type { Collector, CollectResult } from './types';

/**
 * The Treasury Fiscal Time Series (Historical Fiscal Indicators 1972–2025) is
 * the authoritative annual series for Crown revenue, spending, debt and GDP.
 * The workbook is a small (~110 KB) XLSX republished each January.
 */
const SOURCE_PAGE =
  'https://www.treasury.govt.nz/publications/information-release/data-fiscal-time-series-historical-fiscal-indicators';
const XLSX_URL =
  'https://www.treasury.govt.nz/sites/default/files/2026-01/fiscaltimeseries1972-2025-year-end25.xlsx';

/**
 * Functional-classification labels for Core Crown expenses, keyed by their
 * 1-based column index on the "Spending" sheet. Labels are shortened from the
 * verbose workbook headers for display.
 */
const CATEGORY_COLUMNS: Record<number, string> = {
  7: 'Social security and welfare',
  8: 'Health',
  9: 'Education',
  10: 'Core government services',
  11: 'Law and order',
  12: 'Defence',
  13: 'Transport and communications',
  14: 'Economic and industrial services',
  15: 'Other functions',
  16: 'Finance costs',
  17: 'Net foreign exchange losses',
};

/** Read a cell as plain text, unwrapping rich-text and formula-result values. */
function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
    if ('result' in value) return String(value.result ?? '');
    if ('text' in value) return String(value.text ?? '');
    return '';
  }
  return String(value);
}

/** Read a cell as a finite number, or null when blank/non-numeric. */
function cellNumber(value: ExcelJS.CellValue): number | null {
  const text = cellText(value).replace(/[^0-9.-]/g, '');
  if (!text || text === '-' || text === '.') return null;
  const num = Number.parseFloat(text);
  return Number.isFinite(num) ? num : null;
}

/** Extract a four-digit fiscal year from a cell (handles suffixes like `2005^`). */
function parseYear(value: ExcelJS.CellValue): number | null {
  const match = cellText(value).match(/(19|20)\d{2}/);
  if (!match) return null;
  const year = Number.parseInt(match[0], 10);
  return year >= 1900 && year <= 2100 ? year : null;
}

/** Build the year → nominal GDP (NZD millions) map from the "Nominal GDP" sheet. */
function parseGdp(sheet: ExcelJS.Worksheet): Map<number, number> {
  const gdp = new Map<number, number>();
  sheet.eachRow((row) => {
    const year = parseYear(row.getCell(2).value);
    const value = cellNumber(row.getCell(3).value);
    if (year !== null && value !== null) gdp.set(year, value);
  });
  return gdp;
}

/**
 * Parse the "Spending" sheet's absolute-dollar block (NZD millions). The sheet
 * repeats the series lower down as a percentage of GDP; that block starts at a
 * row whose first cell reads "% GDP", which terminates parsing.
 */
function parseSpending(
  sheet: ExcelJS.Worksheet,
  gdp: Map<number, number>,
  fetchedAt: string,
): SpendingYear[] {
  const records: SpendingYear[] = [];

  for (let r = 5; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    const basis = cellText(row.getCell(1).value).trim();
    // The "% GDP" section repeats every series as a ratio — stop before it.
    if (/%\s*GDP/i.test(basis)) break;

    const year = parseYear(row.getCell(2).value);
    if (year === null) continue;

    const financialNetExpenditure = cellNumber(row.getCell(3).value);
    const coreCrownExpenses = cellNumber(row.getCell(4).value);
    const totalCrownExpenses = cellNumber(row.getCell(5).value);
    // Genuine data rows carry at least one headline spending measure.
    if (financialNetExpenditure === null && coreCrownExpenses === null) continue;

    const categories: SpendingCategory[] = [];
    for (const [col, category] of Object.entries(CATEGORY_COLUMNS)) {
      const amount = cellNumber(row.getCell(Number(col)).value);
      if (amount !== null) categories.push({ category, amount });
    }

    records.push({
      year,
      basis: basis || 'Unknown',
      yearType: /march/i.test(basis) ? 'March' : 'June',
      financialNetExpenditure,
      coreCrownExpenses,
      totalCrownExpenses,
      nominalGdp: gdp.get(year) ?? null,
      categories,
      sourceUrl: SOURCE_PAGE,
      fetchedAt,
    });
  }

  return records;
}

async function run(): Promise<CollectResult<SpendingYear>> {
  const path = await fetchToCache(XLSX_URL);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);

  const spendingSheet = workbook.getWorksheet('Spending');
  const gdpSheet = workbook.getWorksheet('Nominal GDP');
  if (!spendingSheet || !gdpSheet) {
    throw new Error('Fiscal Time Series workbook missing "Spending" or "Nominal GDP" sheet');
  }

  const fetchedAt = new Date().toISOString();
  const gdp = parseGdp(gdpSheet);
  const records = parseSpending(spendingSheet, gdp, fetchedAt).sort((a, b) => a.year - b.year);

  return { records, sources: [SOURCE_PAGE, XLSX_URL] };
}

export const spendingCollector: Collector<SpendingYear> = {
  domain: 'spending',
  describe: 'Annual Crown spending & GDP from the Treasury Fiscal Time Series',
  run,
};
