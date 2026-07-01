import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CACHE_DIR = join(process.cwd(), '.cache');
const USER_AGENT =
  'poc-politicians-tracker/0.1 (public NZ political data research; contact: local)';

/** Default cache lifetime: 24 hours. */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
/** Politeness delay between live network requests. */
const REQUEST_DELAY_MS = 750;

let lastRequestAt = 0;

function cachePath(url: string): string {
  const hash = createHash('sha1').update(url).digest('hex');
  return join(CACHE_DIR, `${hash}.txt`);
}

async function isFresh(path: string, ttlMs: number): Promise<boolean> {
  if (!existsSync(path)) return false;
  const info = await stat(path);
  return Date.now() - info.mtimeMs < ttlMs;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface FetchOptions {
  /** Cache lifetime in milliseconds. Set to 0 to bypass the cache. */
  ttlMs?: number;
  /** Whether to force a fresh network request, ignoring any cached copy. */
  force?: boolean;
}

/**
 * Fetch a URL as text with on-disk caching and polite rate limiting.
 * Cached responses live under `.cache/` keyed by a hash of the URL.
 */
export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
  const { ttlMs = DEFAULT_TTL_MS, force = false } = options;
  const path = cachePath(url);

  if (!force && ttlMs > 0 && (await isFresh(path, ttlMs))) {
    return readFile(path, 'utf8');
  }

  const wait = REQUEST_DELAY_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/json,text/csv,*/*' },
  });
  if (!res.ok) {
    throw new Error(`Request failed ${res.status} ${res.statusText} for ${url}`);
  }
  const body = await res.text();

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(path, body, 'utf8');
  return body;
}

/** Fetch and parse JSON with the same caching semantics as {@link fetchText}. */
export async function fetchJson<T = unknown>(url: string, options?: FetchOptions): Promise<T> {
  const text = await fetchText(url, options);
  return JSON.parse(text) as T;
}
