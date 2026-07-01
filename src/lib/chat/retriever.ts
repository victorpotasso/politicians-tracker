import type { ChatDoc } from './types';

export interface RetrievalHit {
  doc: ChatDoc;
  score: number;
}

const K1 = 1.4;
const B = 0.4;
const TITLE_REPEAT = 4;

/** Lowercase, strip diacritics, split on non-alphanumerics, drop 1-char tokens. */
export function tokenize(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

/** Bounded Levenshtein — returns early once the distance exceeds `max`. */
function boundedLevenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

interface DocEntry {
  doc: ChatDoc;
  tf: Map<string, number>;
  length: number;
  titleTerms: Set<string>;
  titleIdfMass: number;
}

/**
 * Pure BM25 retriever with title boosting and query-side fuzzy resolution.
 * No embeddings, no dependencies, diacritic-normalised.
 */
export class LexicalRetriever {
  private entries: DocEntry[] = [];
  private idf = new Map<string, number>();
  private vocab: string[] = [];
  private avgDocLength = 0;

  constructor(docs: ChatDoc[]) {
    const df = new Map<string, number>();

    for (const doc of docs) {
      // Repeat the title so a name query outranks a sentence that merely
      // contains the name. `relations` is grounding-only — excluded from index.
      const titleTokens = tokenize(doc.title);
      const indexedText = [...Array(TITLE_REPEAT).fill(doc.title), doc.subtitle, doc.text].join(
        ' ',
      );
      const tokens = tokenize(indexedText);

      const tf = new Map<string, number>();
      for (const tok of tokens) tf.set(tok, (tf.get(tok) ?? 0) + 1);

      for (const term of tf.keys()) df.set(term, (df.get(term) ?? 0) + 1);

      this.entries.push({
        doc,
        tf,
        length: tokens.length,
        titleTerms: new Set(titleTokens),
        titleIdfMass: 0,
      });
    }

    const n = docs.length || 1;
    for (const [term, freq] of df) {
      // +1 smoothing keeps idf strictly positive.
      this.idf.set(term, Math.log(1 + (n - freq + 0.5) / (freq + 0.5)));
    }
    this.vocab = [...df.keys()];
    this.avgDocLength = this.entries.reduce((sum, e) => sum + e.length, 0) / n;

    // Pre-compute how much idf-mass each doc's title carries.
    for (const entry of this.entries) {
      let mass = 0;
      for (const term of entry.titleTerms) mass += this.idf.get(term) ?? 0;
      entry.titleIdfMass = mass || 1e-6;
    }
  }

  /** Resolve a query token to the closest vocab term (typo tolerance). */
  private resolveToken(token: string): string | null {
    if (this.idf.has(token)) return token;
    const max = token.length > 5 ? 2 : 1;
    let best: string | null = null;
    let bestDist = max + 1;
    for (const term of this.vocab) {
      const dist = boundedLevenshtein(token, term, max);
      if (dist < bestDist) {
        bestDist = dist;
        best = term;
        if (dist === 0) break;
      }
    }
    return bestDist <= max ? best : null;
  }

  search(query: string, topK = 5): RetrievalHit[] {
    const rawTokens = tokenize(query);
    const queryTerms: string[] = [];
    for (const tok of rawTokens) {
      const resolved = this.resolveToken(tok);
      if (resolved) queryTerms.push(resolved);
    }
    if (queryTerms.length === 0) return [];

    const querySet = new Set(queryTerms);
    let queryIdfMass = 0;
    for (const term of querySet) queryIdfMass += this.idf.get(term) ?? 0;
    queryIdfMass = queryIdfMass || 1e-6;

    const hits: RetrievalHit[] = [];

    for (const entry of this.entries) {
      const lengthNorm = 1 - B + (B * entry.length) / (this.avgDocLength || 1);
      let bm25 = 0;
      let titleMatchMass = 0;

      for (const term of querySet) {
        const tf = entry.tf.get(term);
        if (!tf) continue;
        const idf = this.idf.get(term) ?? 0;
        bm25 += (idf * (tf * (K1 + 1))) / (tf + K1 * lengthNorm);
        if (entry.titleTerms.has(term)) titleMatchMass += idf;
      }

      if (bm25 <= 0) continue;

      const base = bm25 / queryIdfMass;
      const overlap = titleMatchMass / queryIdfMass; // query covered by title
      const coverage = titleMatchMass / entry.titleIdfMass; // title covered by query
      const groupPrior = entry.doc.group === 'person' || entry.doc.group === 'party' ? 1.15 : 1;

      const score = base * (1 + 0.85 * overlap + 0.6 * coverage) * groupPrior;
      hits.push({ doc: entry.doc, score });
    }

    return hits.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}
