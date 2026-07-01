import { tokenize } from './retriever';
import type { ChatDoc } from './types';

export interface Candidate {
  doc: ChatDoc;
  score: number;
}

export interface FinalizedAnswer {
  text: string;
  sources: ChatDoc[];
}

// Generic domain words that don't identify a specific record.
const GENERIC = new Set([
  'bill',
  'bills',
  'party',
  'parties',
  'poll',
  'polls',
  'polling',
  'vote',
  'votes',
  'voted',
  'mp',
  'mps',
  'parliament',
  'minister',
  'ministers',
  'seat',
  'seats',
  'election',
  'new',
  'zealand',
  'aotearoa',
  'member',
  'members',
  'record',
  'records',
  'government',
  'opposition',
  'the',
  'act',
  'national',
]);

const CITE_RE = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

/** Extract the distinct citation numbers referenced in the answer, in order. */
function extractCitations(text: string): number[] {
  const seen = new Set<number>();
  const order: number[] = [];
  let match: RegExpExecArray | null;
  CITE_RE.lastIndex = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop.
  while ((match = CITE_RE.exec(text)) !== null) {
    for (const part of match[1].split(',')) {
      const n = Number.parseInt(part.trim(), 10);
      if (!Number.isNaN(n) && !seen.has(n)) {
        seen.add(n);
        order.push(n);
      }
    }
  }
  return order;
}

/** Distinctive title tokens for a doc (proper nouns, years), minus generics. */
function distinctiveTokens(doc: ChatDoc): string[] {
  const raw = tokenize(doc.title);
  return raw.filter((t) => !GENERIC.has(t) && (t.length > 3 || /^\d{4}$/.test(t)));
}

/** Does the answer name this person? Require ≥2 name-parts near each other. */
function answerNamesPerson(answer: string, doc: ChatDoc): boolean {
  const tokens = distinctiveTokens(doc);
  if (tokens.length === 0) return false;
  const answerTokens = tokenize(answer);
  const positions: number[] = [];
  for (let i = 0; i < answerTokens.length; i++) {
    if (tokens.includes(answerTokens[i])) positions.push(i);
  }
  if (positions.length < Math.min(2, tokens.length)) return false;
  // Require two name parts within a 4-word window.
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] - positions[i - 1] <= 4) return true;
  }
  return tokens.length === 1 && positions.length >= 1;
}

/** Does the answer name this non-person entity? Any distinctive title token. */
function answerNamesEntity(answer: string, doc: ChatDoc): boolean {
  const tokens = distinctiveTokens(doc);
  const answerTokens = new Set(tokenize(answer));
  return tokens.some((t) => answerTokens.has(t));
}

/**
 * Normalise the messy `[n]` markers a small model emits: keep only valid
 * numbers, renumber contiguously, and rewrite the answer text. Falls back to
 * citing the records the answer *names* when it emitted no valid markers.
 */
export function resolveAnswerSources(
  text: string,
  candidates: Candidate[],
  exclude?: (doc: ChatDoc) => boolean,
): FinalizedAnswer {
  const ranked = [...candidates].sort((a, b) => b.score - a.score);
  const valid = ranked.filter((c) => !exclude?.(c.doc));

  const emitted = extractCitations(text);
  // The model uses 1-based indices into the grounding (ranked candidates).
  const cited = emitted.map((n) => valid[n - 1]?.doc).filter((d): d is ChatDoc => Boolean(d));

  let sources: ChatDoc[];
  if (cited.length > 0) {
    sources = dedupe(cited);
  } else {
    // No usable markers — cite what the answer actually names.
    const named: ChatDoc[] = [];
    for (const { doc } of valid) {
      const names =
        doc.group === 'person' ? answerNamesPerson(text, doc) : answerNamesEntity(text, doc);
      if (names) named.push(doc);
    }
    sources = dedupe(named).slice(0, 4);
  }

  // Renumber inline markers contiguously against the final source list.
  const indexById = new Map(sources.map((d, i) => [d.id, i + 1]));
  const originalIndex = new Map(valid.map((c, i) => [i + 1, c.doc.id]));

  const rewritten = text.replace(CITE_RE, (_, group: string) => {
    const nums = group
      .split(',')
      .map((p) => Number.parseInt(p.trim(), 10))
      .map((n) => indexById.get(originalIndex.get(n) ?? '') ?? null)
      .filter((n): n is number => n != null);
    const unique = [...new Set(nums)].sort((a, b) => a - b);
    return unique.length ? `[${unique.join(', ')}]` : '';
  });

  return { text: rewritten.replace(/\s+([.,;])/g, '$1').trim(), sources };
}

function dedupe(docs: ChatDoc[]): ChatDoc[] {
  const seen = new Set<string>();
  const out: ChatDoc[] = [];
  for (const doc of docs) {
    if (seen.has(doc.id)) continue;
    seen.add(doc.id);
    out.push(doc);
  }
  return out;
}
