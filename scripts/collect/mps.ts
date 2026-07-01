import type { MP } from '../../src/types/records';
import { parseCsvObjects } from '../lib/csv';
import { fetchJson, fetchText } from '../lib/fetch-cache';
import { MP_OVERRIDES } from '../lib/mp-overrides';
import { clean, slugify, toParty } from '../lib/normalize';
import type { CollectOptions, Collector, CollectResult } from './types';

const CKAN_PACKAGE =
  'https://catalogue.data.govt.nz/api/3/action/package_show?id=members-of-parliament';

interface CkanResource {
  name: string;
  url: string;
  format: string;
}

interface CkanPackage {
  result: { resources: CkanResource[] };
}

/** Build "First Last" from a "Surname, First" contact string. */
function displayName(contact: string): string {
  const [surname, ...rest] = contact.split(',');
  const first = rest.join(',').trim();
  return clean(`${first} ${surname.trim()}`) ?? contact.trim();
}

/** Slug that matches voted.nz person/photo slugs: `surname-first`. */
function toSlug(contact: string): string {
  const [surname, ...rest] = contact.split(',');
  return slugify(`${surname} ${rest.join(' ')}`);
}

/**
 * Collect the current roster of MPs from the official "Members of Parliament"
 * dataset on data.govt.nz (Parliamentary Service). Photos and voting records are
 * keyed by a `surname-first` slug so they line up with voted.nz.
 */
async function run(options: CollectOptions): Promise<CollectResult<MP>> {
  const fetchedAt = new Date().toISOString();
  const pkg = await fetchJson<CkanPackage>(CKAN_PACKAGE, { force: options.force });

  const resource = (pkg.result.resources ?? []).find(
    (r) => /current members/i.test(r.name) && /csv/i.test(r.format),
  );
  if (!resource) {
    throw new Error('Could not find the current members CSV resource.');
  }

  const csv = await fetchText(resource.url, { force: options.force });
  const rows = parseCsvObjects(csv);
  const records: MP[] = [];

  for (const row of rows) {
    const contact = row.Contact ?? row.contact ?? '';
    if (!contact.includes(',')) continue;

    const rawSlug = toSlug(contact);
    // Correct records whose source name is corrupted (macrons/diacritics).
    const override = MP_OVERRIDES[rawSlug];
    const mpId = override?.mpId ?? rawSlug;
    const name = override?.name ?? displayName(contact);
    const jobTitle = clean(row['Job Title']);
    const electorateField = clean(row.Electorate);
    const electorate = electorateField ?? (/(list)/i.test(jobTitle ?? '') ? 'List' : null);

    records.push({
      mpId,
      name,
      party: toParty(row.Party),
      electorate,
      role: clean(row['Salutation/Title']) || null,
      firstElected: null,
      profileUrl: `https://voted.nz/people/${mpId}/`,
      photoUrl: `https://voted.nz/images/people/128/${mpId}.jpg`,
      sourceUrl: resource.url,
      fetchedAt,
    });
  }

  return { records, sources: [CKAN_PACKAGE, resource.url] };
}

export const mpsCollector: Collector<MP> = {
  domain: 'mps',
  describe: 'Current MPs (data.govt.nz, Parliamentary Service)',
  run,
};
