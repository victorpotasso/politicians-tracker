import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Dataset, DatasetMeta, Domain } from '../../src/types/records';

const DATA_DIR = join(process.cwd(), 'data');

function datasetPath(domain: Domain): string {
  return join(DATA_DIR, `${domain}.json`);
}

/** Persist a normalized dataset to `data/<domain>.json` with metadata. */
export async function writeDataset<T>(
  domain: Domain,
  records: T[],
  sources: string[],
): Promise<string> {
  const meta: DatasetMeta = {
    domain,
    count: records.length,
    collectedAt: new Date().toISOString(),
    sources,
  };
  const dataset: Dataset<T> = { meta, records };
  await mkdir(DATA_DIR, { recursive: true });
  const path = datasetPath(domain);
  await writeFile(path, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8');
  return path;
}

/** Read a normalized dataset, returning an empty dataset when absent. */
export async function readDataset<T>(domain: Domain): Promise<Dataset<T>> {
  const path = datasetPath(domain);
  if (!existsSync(path)) {
    return {
      meta: { domain, count: 0, collectedAt: '', sources: [] },
      records: [],
    };
  }
  return JSON.parse(await readFile(path, 'utf8')) as Dataset<T>;
}
