import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Dataset, MP } from '../src/types/records';

const MPS_JSON = join(process.cwd(), 'data', 'mps.json');
const OUT_DIR = join(process.cwd(), 'public', 'politicians');
const UA = 'poc-politicians-tracker/0.1 (public NZ political data research; contact: local)';
const DELAY_MS = 1100;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface WikiPage {
  title: string;
  description?: string;
  thumbnail?: { source: string };
}

const NZ = /new zealand|zealand/i;
const POLITICIAN =
  /politician|member of parliament|\bmp\b|minister|prime minister|party|list member|electorate|speaker/i;

/** Fetch a validated NZ-politician portrait URL from Wikipedia, if one exists. */
async function wikipediaPhoto(name: string): Promise<string | null> {
  const query = encodeURIComponent(`${name} New Zealand politician`);
  const searchUrl =
    `https://en.wikipedia.org/w/api.php?action=query&generator=search` +
    `&gsrsearch=${query}&gsrlimit=1&prop=pageimages|description` +
    `&piprop=thumbnail&pithumbsize=400&format=json`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(searchUrl, { headers: { 'user-agent': UA } });
      if (res.status === 429) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!res.ok) return null;
      const data = (await res.json()) as { query?: { pages?: Record<string, WikiPage> } };
      const page = Object.values(data.query?.pages ?? {})[0];
      if (!page?.thumbnail?.source) return null;

      const text = `${page.title} ${page.description ?? ''}`;
      const nameMatches = name
        .split(' ')
        .some((part) => part.length > 2 && page.title.includes(part));
      if (nameMatches && NZ.test(text) && POLITICIAN.test(text)) {
        return page.thumbnail.source;
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

/**
 * Download MP portraits into public/politicians/<mpId>.jpg. Prefers official
 * Wikipedia/Commons portraits (validated as NZ politicians), falling back to the
 * voted.nz thumbnail. Skips files that already exist unless --force.
 */
async function main(): Promise<void> {
  const force = process.argv.includes('--force');

  if (!existsSync(MPS_JSON)) {
    console.error('data/mps.json not found. Run `pnpm data:collect mps` first.');
    process.exit(1);
  }

  const dataset = JSON.parse(await readFile(MPS_JSON, 'utf8')) as Dataset<MP>;
  await mkdir(OUT_DIR, { recursive: true });

  let wiki = 0;
  let voted = 0;
  let skipped = 0;
  let failed = 0;

  for (const mp of dataset.records) {
    const dest = join(OUT_DIR, `${mp.mpId}.jpg`);
    if (!force && existsSync(dest)) {
      skipped += 1;
      continue;
    }

    await sleep(DELAY_MS);
    const wikiUrl = await wikipediaPhoto(mp.name);
    if (wikiUrl && (await download(wikiUrl, dest))) {
      wiki += 1;
      await sleep(DELAY_MS);
      continue;
    }

    if (mp.photoUrl && (await download(mp.photoUrl, dest))) {
      voted += 1;
      await sleep(DELAY_MS);
      continue;
    }

    failed += 1;
  }

  console.log(
    `Photos → ${OUT_DIR.replace(process.cwd(), '.')}: ${wiki} wikipedia, ${voted} voted.nz, ${skipped} skipped, ${failed} missing.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
