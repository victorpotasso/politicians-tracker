'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ChatDoc } from '@/lib/chat/types';
import { EntityCard } from './entity-card';

/** Render inline `**bold**`, `*italic*`, `` `code` `` and `[n]` citation chips. */
function renderInline(text: string, sources: ChatDoc[], keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[\d+(?:\s*,\s*\d+)*\])/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex loop.
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={key} className="bg-muted rounded px-1 py-0.5 text-[0.85em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      // Citation chip(s).
      const numbers = token
        .slice(1, -1)
        .split(',')
        .map((n) => Number.parseInt(n.trim(), 10));
      for (const n of numbers) {
        const source = sources[n - 1];
        nodes.push(
          source ? (
            <Link
              key={`${key}-${n}`}
              href={source.href}
              title={source.title}
              className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded bg-violet-500/15 px-1 align-super text-[0.65em] font-semibold text-violet-500 transition-colors hover:bg-violet-500/30"
            >
              {n}
            </Link>
          ) : (
            <sup key={`${key}-${n}`} className="text-muted-foreground text-[0.65em]">
              {n}
            </sup>
          ),
        );
      }
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/** Lightweight markdown → React for streamed answers. */
export function renderMarkdown(text: string, sources: ChatDoc[], caret?: ReactNode): ReactNode {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!list) return;
    const items = list.items;
    const ordered = list.ordered;
    blocks.push(
      ordered ? (
        <ol key={`list-${blocks.length}`} className="my-2 list-decimal space-y-1 pl-5">
          {items.map((item, idx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: list rebuilt wholesale each render.
            <li key={`oli-${blocks.length}-${idx}`}>
              {renderInline(item, sources, `oli-${blocks.length}-${idx}`)}
            </li>
          ))}
        </ol>
      ) : (
        <ul key={`list-${blocks.length}`} className="my-2 list-disc space-y-1 pl-5">
          {items.map((item, idx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: list rebuilt wholesale each render.
            <li key={`uli-${blocks.length}-${idx}`}>
              {renderInline(item, sources, `uli-${blocks.length}-${idx}`)}
            </li>
          ))}
        </ul>
      ),
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^\d+\.\s+(.*)$/);

    if (heading) {
      flushList();
      blocks.push(
        <p key={`h-${blocks.length}`} className="mt-2 font-semibold">
          {renderInline(heading[2], sources, `h-${blocks.length}`)}
        </p>,
      );
    } else if (bullet) {
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
    } else if (numbered) {
      if (!list?.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={`p-${blocks.length}`} className="leading-relaxed">
          {renderInline(line, sources, `p-${blocks.length}`)}
        </p>,
      );
    }
  }
  flushList();

  if (caret) {
    blocks.push(
      <span key="caret" className="inline-block align-middle">
        {caret}
      </span>,
    );
  }

  return <div className="space-y-1 text-sm">{blocks}</div>;
}

export function CitationList({ sources }: { sources: ChatDoc[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-muted-foreground text-xs font-medium">
        Grounded in {sources.length} tracker record{sources.length === 1 ? '' : 's'}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {sources.map((doc, i) => (
          <EntityCard key={doc.id} doc={doc} index={i} />
        ))}
      </div>
    </div>
  );
}
