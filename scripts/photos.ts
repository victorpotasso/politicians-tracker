import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Dataset, MP } from '../src/types/records';

const MPS_JSON = join(process.cwd(), 'data', 'mps.json');
const OUT_DIR = join(process.cwd(), 'public', 'politicians');
const USER_AGENT =
  'poc-politicians-tracker/0.1 (public NZ political data research; contact: local)';
const DELAY_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Download MP portrait photos referenced in data/mps.json into
 * public/politicians/<mpId>.jpg. Skips files that already exist unless --force.
 */
async function main(): Promise<void> {
  const force = process.argv.includes('--force');

  if (!existsSync(MPS_JSON)) {
    console.error('data/mps.json not found. Run `pnpm data:collect mps` first.');
    process.exit(1);
  }

  const dataset = JSON.parse(await readFile(MPS_JSON, 'utf8')) as Dataset<MP>;
  await mkdir(OUT_DIR, { recursive: true });

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const mp of dataset.records) {
    if (!mp.photoUrl) continue;
    const dest = join(OUT_DIR, `${mp.mpId}.jpg`);
    if (!force && existsSync(dest)) {
      skipped += 1;
      continue;
    }
    try {
      const res = await fetch(mp.photoUrl, { headers: { 'user-agent': USER_AGENT } });
      if (!res.ok) {
        failed += 1;
        console.warn(`  ! ${mp.mpId}: ${res.status}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      await writeFile(dest, buffer);
      downloaded += 1;
      await sleep(DELAY_MS);
    } catch (error) {
      failed += 1;
      console.warn(`  ! ${mp.mpId}: ${(error as Error).message}`);
    }
  }

  console.log(
    `Photos → ${OUT_DIR.replace(process.cwd(), '.')}: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
