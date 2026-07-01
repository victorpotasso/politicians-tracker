import ExcelJS from 'exceljs';

import type { Expense, MP } from '../../src/types/records';
import { fetchJson, fetchToCache } from '../lib/fetch-cache';
import { readDataset } from '../lib/io';
import { slugify, toAmount } from '../lib/normalize';
import type { CollectOptions, Collector, CollectResult } from './types';

const CKAN_PACKAGE =
  'https://catalogue.data.govt.nz/api/3/action/package_show?id=member-of-parliament-expenses';

/** Number of most-recent quarters to collect. */
const MAX_QUARTERS = 8;

interface CkanResource {
  name: string;
  url: string;
  format: string;
}

interface CkanPackage {
  result: { resources: CkanResource[] };
}

/** Normalise a name to a sorted token key so order/format differences still match. */
function tokenKey(value: string): string {
  return slugify(value).split('-').filter(Boolean).sort().join('-');
}

/** Derive a `YYYY-QN` period from a resource name like "…from 1 Oct to 31 Dec 2025". */
function periodFromName(name: string): string | null {
  const month = name
    .match(/from\s+\d+\s+([A-Za-z]+)/)?.[1]
    ?.slice(0, 3)
    .toLowerCase();
  const year = name.match(/(\d{4})\s*$/)?.[1] ?? name.match(/(\d{4})/)?.[1];
  if (!month || !year) return null;
  const quarter = ['jan', 'feb', 'mar'].includes(month)
    ? 1
    : ['apr', 'may', 'jun'].includes(month)
      ? 2
      : ['jul', 'aug', 'sep'].includes(month)
        ? 3
        : 4;
  return `${year}-Q${quarter}`;
}

/** Categorise an expense column from its header labels. */
function categoryFor(group: string, sub: string): Expense['category'] | null {
  const text = `${group} ${sub}`.toLowerCase();
  if (/grand total|^total|inter-?parliament|cost centre/.test(text)) return null;
  if (/accommodation|lodg/.test(text)) return 'accommodation';
  if (/travel|flight|air|vehicle|transport|mileage/.test(text)) return 'travel';
  return null;
}

interface SheetLayout {
  headerRow: number;
  memberCol: number;
  columns: Array<{ index: number; label: string; category: Expense['category'] }>;
}

/** Detect the header row and column layout, which varies between quarterly files. */
function detectLayout(ws: ExcelJS.Worksheet): SheetLayout | null {
  const text = (r: number, c: number) => String(ws.getRow(r).getCell(c).value ?? '').trim();

  let headerRow = 0;
  let memberCol = 0;
  for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
    for (let c = 1; c <= ws.columnCount; c++) {
      if (/^member$/i.test(text(r, c))) {
        headerRow = r;
        memberCol = c;
        break;
      }
    }
    if (headerRow) break;
  }
  if (!headerRow || !memberCol) return null;

  const columns: SheetLayout['columns'] = [];
  for (let c = 1; c <= ws.columnCount; c++) {
    const sub = text(headerRow, c);
    const group = text(headerRow - 1, c);
    const category = categoryFor(group, sub);
    if (!category) continue;
    const label = [group, sub].filter(Boolean).join(' — ').replace(/\s+/g, ' ');
    columns.push({ index: c, label: label || category, category });
  }
  return columns.length ? { headerRow, memberCol, columns } : null;
}

async function run(options: CollectOptions): Promise<CollectResult<Expense>> {
  const fetchedAt = new Date().toISOString();
  const records: Expense[] = [];

  // Build a name → mpId lookup from the collected MP roster.
  const mps = await readDataset<MP>('mps');
  const mpByKey = new Map<string, string>();
  for (const mp of mps.records) mpByKey.set(tokenKey(mp.name), mp.mpId);

  let pkg: CkanPackage;
  try {
    pkg = await fetchJson<CkanPackage>(CKAN_PACKAGE, { force: options.force });
  } catch (error) {
    console.warn(`  ! Expenses dataset unavailable: ${(error as Error).message}`);
    return { records, sources: [CKAN_PACKAGE] };
  }

  const quarters = (pkg.result.resources ?? [])
    .filter((r) => /xlsx/i.test(r.format) || /\.xlsx$/i.test(r.url))
    .map((r) => ({ ...r, period: periodFromName(r.name) }))
    .filter((r) => r.period)
    .sort((a, b) => (b.period as string).localeCompare(a.period as string))
    .slice(0, MAX_QUARTERS);

  const sources = [CKAN_PACKAGE];
  let unmatched = 0;

  for (const quarter of quarters) {
    const path = await fetchToCache(quarter.url, { force: options.force });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path);
    const ws = wb.getWorksheet('ALL') ?? wb.worksheets[0];
    if (!ws) continue;
    const layout = detectLayout(ws);
    if (!layout) {
      console.warn(`  ~ Could not detect layout for ${quarter.period}.`);
      continue;
    }
    sources.push(quarter.url);

    ws.eachRow((row, rowNumber) => {
      if (rowNumber <= layout.headerRow) return;
      const member = String(row.getCell(layout.memberCol).value ?? '').trim();
      if (!member || /grand total|^total|^\d/.test(member)) return;

      const mpId = mpByKey.get(tokenKey(member)) ?? null;
      if (!mpId) unmatched += 1;

      for (const col of layout.columns) {
        const amount = toAmount(String(row.getCell(col.index).value ?? ''));
        if (amount == null || amount === 0) continue;
        records.push({
          mpId,
          ministerName: null,
          period: quarter.period as string,
          category: col.category,
          amount,
          description: col.label,
          sourceUrl: quarter.url,
          fetchedAt,
        });
      }
    });
  }

  if (unmatched > 0) {
    console.warn(`  ~ ${unmatched} expense rows could not be matched to a known MP.`);
  }
  return { records, sources };
}

export const expensesCollector: Collector<Expense> = {
  domain: 'expenses',
  describe: 'Quarterly MP expenses (data.govt.nz, Parliamentary Service)',
  run,
};
