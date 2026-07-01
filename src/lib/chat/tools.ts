import { LexicalRetriever } from './retriever';
import type { ChatDoc, SearchGroup } from './types';

export interface Citation {
  doc: ChatDoc;
  score: number;
}

export type CitationCollector = (doc: ChatDoc, score: number) => void;

export interface EntityTool {
  name: string;
  group: SearchGroup;
  /** Human label shown in the live thought trail. */
  label: string;
  run: (query: string) => { text: string; count: number };
}

interface ToolConfig {
  name: string;
  label: string;
}

const CONFIGS: Record<SearchGroup, ToolConfig> = {
  person: { name: 'search_people', label: 'Searched MPs' },
  party: { name: 'search_parties', label: 'Searched parties' },
  bill: { name: 'search_bills', label: 'Searched bills' },
  poll: { name: 'search_polls', label: 'Searched polls' },
};

function makeEntityTool(
  retriever: LexicalRetriever,
  collect: CitationCollector,
  group: SearchGroup,
): EntityTool {
  const config = CONFIGS[group];
  return {
    name: config.name,
    group,
    label: config.label,
    run(query: string) {
      const hits = retriever.search(query, 12).filter((h) => h.doc.group === group);
      const top = hits.slice(0, 3);
      for (const hit of top) collect(hit.doc, hit.score);
      const text = top.map((h) => `${h.doc.title} — ${h.doc.lead}`).join('\n');
      return { text, count: top.length };
    },
  };
}

export interface ToolDeps {
  corpus: ChatDoc[];
  collect: CitationCollector;
}

/** Build one entity-scoped BM25 search tool per group, sharing one retriever. */
export function createArchiveTools(deps: ToolDeps): EntityTool[] {
  const retriever = new LexicalRetriever(deps.corpus);
  return [
    makeEntityTool(retriever, deps.collect, 'person'),
    makeEntityTool(retriever, deps.collect, 'party'),
    makeEntityTool(retriever, deps.collect, 'bill'),
    makeEntityTool(retriever, deps.collect, 'poll'),
  ];
}
