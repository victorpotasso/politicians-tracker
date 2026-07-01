'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentProgress } from '@/lib/chat/types';
import { AssistantOrb } from './assistant-orb';
import { ChatComposer } from './chat-composer';
import { ChatMessage } from './chat-message';
import { useChat } from './chat-provider';

const TOOL_LABELS: Record<string, string> = {
  search_people: 'Searched MPs',
  search_parties: 'Searched parties',
  search_bills: 'Searched bills',
  search_polls: 'Searched polls',
};

const PHASES = [
  'Searching the tracker',
  'Reading the records',
  'Connecting people, parties & votes',
  'Composing the answer',
];

const SUGGESTIONS = [
  'What has the Green Party been up to?',
  'Tell me about the End of Life Choice Bill',
  'Who are the ACT Party MPs?',
  'What do the latest polls show?',
];

function ReasoningLine({ progress }: { progress: AgentProgress }) {
  const label = progress.tool
    ? (TOOL_LABELS[progress.tool] ?? 'Searching')
    : 'Composing the answer';
  const suffix = progress.tool && progress.count != null ? ` · ${progress.count}` : '';
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={label + suffix}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="archive-shimmer text-sm font-medium"
      >
        {label}
        {suffix}
      </motion.span>
    </AnimatePresence>
  );
}

function PhaseCycler() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i < PHASES.length - 1 ? i + 1 : i));
    }, 1900);
    return () => clearInterval(timer);
  }, []);
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={PHASES[index]}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="archive-shimmer text-sm font-medium"
      >
        {PHASES[index]}
      </motion.span>
    </AnimatePresence>
  );
}

function ThinkingIndicator({ progress }: { progress?: AgentProgress }) {
  return (
    <div className="flex gap-3">
      <AssistantOrb pulsing className="mt-0.5 size-8" />
      <div className="flex items-center gap-2 pt-1.5">
        {progress?.active ? <ReasoningLine progress={progress} /> : <PhaseCycler />}
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1 animate-bounce rounded-full bg-violet-400"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

export function ChatPane({ conversationId }: { conversationId?: string }) {
  const { conversations, pending, streaming, agentProgress, send } = useChat();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversation = useMemo(
    () => (conversationId ? conversations.find((c) => c.id === conversationId) : undefined),
    [conversations, conversationId],
  );

  const messageCount = conversation?.turns.length ?? 0;
  const isPending = conversationId ? pending[conversationId] : false;
  const isStreaming = conversationId ? streaming[conversationId] : false;
  const progress = conversationId ? agentProgress[conversationId] : undefined;
  const lastTurn = conversation?.turns[messageCount - 1];
  const streamedLength = lastTurn?.text.length ?? 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on any content change.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messageCount, isPending, streamedLength]);

  const handleSend = async (text: string) => {
    const id = await send(conversationId ?? null, text);
    if (!conversationId) router.push(`/chat/c/${id}`);
  };

  const isWelcome = !conversationId && messageCount === 0;
  const showThinking = isPending && lastTurn?.role !== 'assistant';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          {isWelcome ? (
            <WelcomeState onPick={handleSend} />
          ) : (
            <div className="space-y-6">
              {conversation?.turns.map((turn, idx) => {
                const isLast = idx === messageCount - 1;
                return (
                  <ChatMessage
                    key={turn.id}
                    turn={turn}
                    streaming={isLast && turn.role === 'assistant' && isStreaming}
                  />
                );
              })}
              {showThinking ? <ThinkingIndicator progress={progress} /> : null}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 pt-2 sm:px-6">
        <ChatComposer onSend={handleSend} />
      </div>
    </div>
  );
}

function WelcomeState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center pt-10 text-center sm:pt-16">
      <AssistantOrb className="size-16" />
      <h1 className="text-fluid-hero text-brand-gradient font-display mt-6 font-bold">
        Ask the tracker
      </h1>
      <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">
        Ask about any MP, party, bill or recent poll. Every answer is pulled from the New Zealand
        political records and links you straight to the source — running privately in your browser.
      </p>

      <div className="mt-8 grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onPick(suggestion)}
            className="border-border/50 bg-card/40 hover:border-violet-400/50 hover:bg-card/70 rounded-xl border p-3 text-left text-sm backdrop-blur-xl transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
