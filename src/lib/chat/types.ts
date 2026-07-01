/**
 * Shared types for the in-browser chat experience.
 *
 * The chat surface reasons over a corpus of `ChatDoc`s (one per political
 * entity), retrieves grounding with a BM25 retriever, streams a grounded answer
 * from a WebGPU model, and cites the records the answer actually used.
 */

export type SearchGroup = 'person' | 'party' | 'bill' | 'poll';

/** One retrievable, citeable entity in the archive. */
export interface ChatDoc {
  id: string;
  group: SearchGroup;
  /** Primary human name — used for citation matching and the card title. */
  title: string;
  /** Short context line (party + electorate, date, pollster…). */
  subtitle: string;
  /** ≤ ~160-char one-liner used as the card body. */
  lead: string;
  /** Portrait / thumbnail (people). */
  image?: string;
  /** Deep link to the entity's detail page. */
  href: string;
  /** Full prose used for BM25 matching + LLM grounding. */
  text: string;
  /** Pre-computed facts injected only into the LLM prompt, never the index. */
  relations?: string;
}

/** A single conversational turn. */
export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Cited source records resolved after the answer finished streaming. */
  sources?: ChatDoc[];
  /** Optional supporting snippet quoted under the answer. */
  snippet?: string;
  /** Titles the assistant cited — used to disambiguate follow-up questions. */
  entityTitles?: string[];
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  turns: ChatTurn[];
  createdAt: number;
  updatedAt: number;
}

/** Live "thought trail" events emitted while the agent works. */
export type AgentEvent = { type: 'tool'; tool: string; count: number } | { type: 'generating' };

export interface AgentProgress {
  active: boolean;
  /** Last tool that reported activity, e.g. `search_people`. */
  tool?: string;
  count?: number;
}
