import type { RetrievalHit } from './retriever';
import { tokenize } from './retriever';
import type { ChatDoc } from './types';

export type Confidence = 'high' | 'low' | 'none';

// Calibrated to the normalized BM25 score in `retriever.ts`. Tune per corpus.
const HIGH = 2;
const LOW = 0.55;

export function scoreConfidence(hits: RetrievalHit[]): Confidence {
  const top = hits[0]?.score ?? 0;
  if (top >= HIGH) return 'high';
  if (top >= LOW) return 'low';
  return 'none';
}

/** Pick the sentence from a doc with the most query-term overlap. */
function bestSentence(doc: ChatDoc, queryTerms: Set<string>): string {
  const sentences = doc.text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  let best = doc.lead;
  let bestScore = -1;
  for (const sentence of sentences) {
    const terms = tokenize(sentence);
    let overlap = 0;
    for (const t of terms) if (queryTerms.has(t)) overlap += 1;
    if (overlap > bestScore) {
      bestScore = overlap;
      best = sentence.trim();
    }
  }
  return best;
}

export interface ComposedAnswer {
  primary: string;
  snippet: string;
  sources: ChatDoc[];
}

/**
 * Template-only answer used when the WebGPU model is unavailable. Grounds the
 * response purely in the BM25 retrieval so the chat still works everywhere.
 */
export function composeAnswer(query: string, hits: RetrievalHit[]): ComposedAnswer {
  const confidence = scoreConfidence(hits);
  const queryTerms = new Set(tokenize(query));

  if (confidence === 'none' || hits.length === 0) {
    return {
      primary:
        "I couldn't find anything about that in the tracker. Try a name, party, bill or poll.",
      snippet: '',
      sources: [],
    };
  }

  const top = hits[0].doc;
  const snippet = bestSentence(top, queryTerms);
  const sources = hits.slice(0, confidence === 'high' ? 3 : 4).map((h) => h.doc);

  const primary =
    confidence === 'high'
      ? `Here's what the tracker has on ${top.title}:`
      : "I'm not fully certain, but here are the closest records:";

  return { primary, snippet, sources };
}
