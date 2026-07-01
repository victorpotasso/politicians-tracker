'use client';

import { AnimatePresence, motion } from 'motion/react';
import type { ChatTurn } from '@/lib/chat/types';
import { AssistantOrb } from './assistant-orb';
import { CitationList, renderMarkdown } from './citations';

interface ChatMessageProps {
  turn: ChatTurn;
  streaming?: boolean;
}

export function ChatMessage({ turn, streaming = false }: ChatMessageProps) {
  if (turn.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-linear-to-br from-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm text-white shadow-lg shadow-fuchsia-500/20">
          {turn.text}
        </div>
      </div>
    );
  }

  const showCaret = streaming || turn.text.length === 0;
  // Hide a half-streamed citation like "[1" until the closing bracket arrives.
  const visibleText = showCaret ? turn.text.replace(/\[[\d,\s]*$/, '') : turn.text;
  const sources = turn.sources ?? [];

  const caret = showCaret ? (
    <span className="archive-caret ml-0.5 inline-block h-4 w-[3px] rounded-full bg-violet-400 align-middle" />
  ) : undefined;

  return (
    <div className="flex gap-3">
      <AssistantOrb pulsing={showCaret} className="mt-0.5 size-8" />
      <div className="min-w-0 flex-1">
        {renderMarkdown(visibleText, sources, caret)}

        {turn.snippet && !showCaret ? (
          <blockquote className="border-border/60 text-muted-foreground mt-2 border-l-2 pl-3 text-sm italic">
            {turn.snippet}
          </blockquote>
        ) : null}

        <AnimatePresence>
          {!showCaret && sources.length > 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CitationList sources={sources} />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
