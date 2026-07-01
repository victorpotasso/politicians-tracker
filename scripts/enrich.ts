import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Dataset, MP, MpEnrichment } from '../src/types/records';

const MPS_JSON = join(process.cwd(), 'data', 'mps.json');
const OUT_JSON = join(process.cwd(), 'data', 'enrichment.json');
const PHOTO_DIR = join(process.cwd(), 'public', 'politicians');
const UA = 'poc-politicians-tracker/0.1 (public NZ political data research; contact: local)';
const DELAY_MS = 650;

const NZ =
  /new zealand|zealand|aotearoa|green party|labour party|national party|act new zealand|te p[aā]ti m[aā]ori|m[aā]ori party|new zealand first/i;
const POLITICIAN =
  /politician|member of parliament|\bmp\b|minister|party|list member|electorate|candidate|speaker/i;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface WikiPage {
  title: string;
  index?: number;
  description?: string;
  extract?: string;
  fullurl?: string;
  thumbnail?: { source: string };
  original?: { source: string };
}

interface WikiResponse {
  query?: { pages?: WikiPage[] };
}

/** Resolve the best-matching Wikipedia article for an MP and pull bio + image. */
async function lookup(name: string): Promise<WikiPage | null> {
  const query = encodeURIComponent(`${name} New Zealand politician`);
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&generator=search` +
    `&gsrsearch=${query}&gsrlimit=5&format=json&formatversion=2` +
    `&prop=extracts|description|pageimages|info&inprop=url` +
    `&exintro=1&explaintext=1&exsentences=3&piprop=thumbnail&pithumbsize=800`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': UA } });
      if (res.status === 429) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!res.ok) return null;
      const data = (await res.json()) as WikiResponse;
      const pages = (data.query?.pages ?? []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

      const tokens = name.split(/\s+/).filter((t) => t.length > 2);
      for (const page of pages) {
        const haystack = `${page.title} ${page.description ?? ''} ${page.extract ?? ''}`;
        const nameMatches = tokens.some((t) => page.title.toLowerCase().includes(t.toLowerCase()));
        const isPolitician = NZ.test(haystack) && POLITICIAN.test(haystack);
        const notDisambig = !/may refer to|disambiguation/i.test(page.description ?? '');
        if (nameMatches && isPolitician && notDisambig) return page;
      }
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

async function download(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (!res.ok) return false;
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');

  if (!existsSync(MPS_JSON)) {
    console.error('data/mps.json not found. Run `pnpm data:collect mps` first.');
    process.exit(1);
  }

  const dataset = JSON.parse(await readFile(MPS_JSON, 'utf8')) as Dataset<MP>;

  let existing: MpEnrichment[] = [];
  if (!force && existsSync(OUT_JSON)) {
    existing = (JSON.parse(await readFile(OUT_JSON, 'utf8')) as Dataset<MpEnrichment>).records;
  }
  const byId = new Map(existing.map((e) => [e.mpId, e]));

  await mkdir(PHOTO_DIR, { recursive: true });

  const fetchedAt = new Date().toISOString();
  let enriched = 0;
  let photos = 0;
  let missed = 0;

  for (const mp of dataset.records) {
    // Skip only MPs we have already matched; retry previous no-matches.
    if (!force && byId.get(mp.mpId)?.wikipediaTitle) continue;

    await sleep(DELAY_MS);
    const page = await lookup(mp.name);

    if (!page) {
      missed += 1;
      byId.set(mp.mpId, {
        mpId: mp.mpId,
        wikipediaTitle: null,
        wikipediaUrl: null,
        description: null,
        extract: null,
        imageUrl: null,
        sourceUrl: 'https://en.wikipedia.org',
        fetchedAt,
      });
      continue;
    }

    const imageUrl = page.thumbnail?.source ?? page.original?.source ?? null;
    byId.set(mp.mpId, {
      mpId: mp.mpId,
      wikipediaTitle: page.title,
      wikipediaUrl:
        page.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
      description: page.description ?? null,
      extract: page.extract ?? null,
      imageUrl,
      sourceUrl: page.fullurl ?? 'https://en.wikipedia.org',
      fetchedAt,
    });
    enriched += 1;

    // Backfill a portrait for MPs that still lack a local photo.
    const dest = join(PHOTO_DIR, `${mp.mpId}.jpg`);
    if (imageUrl && (force || !existsSync(dest))) {
      await sleep(DELAY_MS);
      if (await download(imageUrl, dest)) photos += 1;
    }
  }

  const records = dataset.records
    .map((mp) => byId.get(mp.mpId))
    .filter((e): e is MpEnrichment => Boolean(e));

  const out: Dataset<MpEnrichment> = {
    meta: {
      domain: 'mps',
      count: records.length,
      collectedAt: fetchedAt,
      sources: ['https://en.wikipedia.org/w/api.php'],
    },
    records,
  };
  await writeFile(OUT_JSON, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

  console.log(
    `Enrichment → ./data/enrichment.json: ${enriched} enriched, ${missed} no-match, ${photos} portraits backfilled.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
