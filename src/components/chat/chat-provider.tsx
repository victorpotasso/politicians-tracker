'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { runArchiveAgent } from '@/lib/chat/agent';
import { composeAnswer } from '@/lib/chat/answer';
import { resolveAnswerSources } from '@/lib/chat/cite';
import { detectSmallTalk, smallTalkReply } from '@/lib/chat/context';
import { getEngine, useModelState, warmEngine } from '@/lib/chat/engine-manager';
import { deleteConversation, listConversations, saveConversation } from '@/lib/chat/history';
import { LexicalRetriever } from '@/lib/chat/retriever';
import type { AgentEvent, AgentProgress, ChatDoc, ChatTurn, Conversation } from '@/lib/chat/types';
import { isWebGpuAvailable } from '@/lib/chat/webllm';

interface ChatContextValue {
  corpus: ChatDoc[];
  ready: boolean;
  conversations: Conversation[];
  pending: Record<string, boolean>;
  streaming: Record<string, boolean>;
  agentProgress: Record<string, AgentProgress>;
  webgpuAvailable: boolean;
  modelLoading: boolean;
  modelReady: boolean;
  modelFailed: boolean;
  modelProgress: number;
  modelStatus: string;
  canSend: boolean;
  send: (id: string | null, text: string) => Promise<string>;
  removeConversation: (id: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within <ChatProvider>');
  return ctx;
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function titleFor(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > 48 ? `${clean.slice(0, 47)}…` : clean;
}

function replaceLastTurn(conv: Conversation, turn: ChatTurn): Conversation {
  return {
    ...conv,
    turns: [...conv.turns.slice(0, -1), turn],
    updatedAt: Date.now(),
  };
}

export function ChatProvider({
  corpus,
  children,
}: {
  corpus: ChatDoc[];
  children: React.ReactNode;
}) {
  const lexical = useMemo(() => new LexicalRetriever(corpus), [corpus]);

  const model = useModelState();
  const modelLoading = model.status === 'loading';
  const modelReady = model.status === 'ready';
  const modelFailed = model.status === 'error' || model.status === 'unsupported';

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [streaming, setStreaming] = useState<Record<string, boolean>>({});
  const [agentProgress, setAgentProgress] = useState<Record<string, AgentProgress>>({});
  const [webgpuAvailable, setWebgpuAvailable] = useState(true);

  const conversationsRef = useRef<Conversation[]>([]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    const supported = isWebGpuAvailable();
    setWebgpuAvailable(supported);
    if (supported) void warmEngine();
    let active = true;
    listConversations().then((list) => {
      if (active) {
        setConversations(list);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const upsert = useCallback((conv: Conversation) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conv.id);
      const next =
        idx >= 0 ? [...prev.slice(0, idx), conv, ...prev.slice(idx + 1)] : [conv, ...prev];
      return next.sort((a, b) => b.updatedAt - a.updatedAt);
    });
    void saveConversation(conv);
  }, []);

  const applyAgentEvent = useCallback((convId: string, event: AgentEvent) => {
    setAgentProgress((prev) => {
      if (event.type === 'generating') {
        return { ...prev, [convId]: { active: true } };
      }
      return { ...prev, [convId]: { active: true, tool: event.tool, count: event.count } };
    });
  }, []);

  const clearProgress = useCallback((convId: string) => {
    setAgentProgress((prev) => {
      const next = { ...prev };
      delete next[convId];
      return next;
    });
  }, []);

  const templatedAnswer = useCallback(
    (text: string) => {
      const hits = lexical.search(text, 5);
      const { primary, snippet, sources } = composeAnswer(text, hits);
      return { text: primary, snippet, sources };
    },
    [lexical],
  );

  const send = useCallback(
    async (id: string | null, text: string): Promise<string> => {
      const trimmed = text.trim();
      const existing = id ? conversationsRef.current.find((c) => c.id === id) : null;
      const convId = existing?.id ?? id ?? uid();
      const now = Date.now();

      const userTurn: ChatTurn = {
        id: uid(),
        role: 'user',
        text: trimmed,
        createdAt: now,
      };

      let conv: Conversation = existing
        ? { ...existing, turns: [...existing.turns, userTurn], updatedAt: now }
        : {
            id: convId,
            title: titleFor(trimmed),
            turns: [userTurn],
            createdAt: now,
            updatedAt: now,
          };
      upsert(conv);
      setPending((p) => ({ ...p, [convId]: true }));

      const history = conv.turns;
      const lastAssistant = [...conv.turns].reverse().find((turn) => turn.role === 'assistant');
      const lastEntityTitles = lastAssistant?.entityTitles ?? [];

      // Fire-and-forget worker — the caller navigates immediately.
      void (async () => {
        try {
          const smallTalk = detectSmallTalk(trimmed, history);
          if (smallTalk) {
            const assistant: ChatTurn = {
              id: uid(),
              role: 'assistant',
              text: smallTalkReply(smallTalk),
              createdAt: Date.now(),
            };
            conv = { ...conv, turns: [...conv.turns, assistant], updatedAt: Date.now() };
            upsert(conv);
            return;
          }

          const engine = getEngine() ?? (await warmEngine());
          if (!engine) {
            const fallback = templatedAnswer(trimmed);
            const assistant: ChatTurn = {
              id: uid(),
              role: 'assistant',
              text: fallback.text,
              snippet: fallback.snippet || undefined,
              sources: fallback.sources,
              entityTitles: fallback.sources.map((s) => s.title),
              createdAt: Date.now(),
            };
            conv = { ...conv, turns: [...conv.turns, assistant], updatedAt: Date.now() };
            upsert(conv);
            return;
          }

          const { stream, candidates } = await runArchiveAgent({
            engine,
            corpus,
            query: trimmed,
            history,
            lastEntityTitles,
            onEvent: (event) => applyAgentEvent(convId, event),
          });

          const assistantId = uid();
          const assistantCreatedAt = Date.now();
          let started = false;
          let accumulated = '';
          for await (const delta of stream) {
            accumulated += delta;
            const assistantTurn: ChatTurn = {
              id: assistantId,
              role: 'assistant',
              text: accumulated,
              createdAt: assistantCreatedAt,
            };
            if (!started) {
              started = true;
              conv = { ...conv, turns: [...conv.turns, assistantTurn], updatedAt: Date.now() };
              setStreaming((s) => ({ ...s, [convId]: true }));
            } else {
              conv = replaceLastTurn(conv, assistantTurn);
            }
            upsert(conv);
          }

          if (!started) {
            // Model produced nothing — fall back to the templated answer.
            const fallback = templatedAnswer(trimmed);
            const assistantTurn: ChatTurn = {
              id: assistantId,
              role: 'assistant',
              text: fallback.text,
              snippet: fallback.snippet || undefined,
              sources: fallback.sources,
              entityTitles: fallback.sources.map((s) => s.title),
              createdAt: assistantCreatedAt,
            };
            conv = { ...conv, turns: [...conv.turns, assistantTurn], updatedAt: Date.now() };
            upsert(conv);
            return;
          }

          const resolved = resolveAnswerSources(accumulated, candidates);
          const finalTurn: ChatTurn = {
            id: assistantId,
            role: 'assistant',
            text: resolved.text,
            sources: resolved.sources,
            entityTitles: resolved.sources.map((s) => s.title),
            createdAt: assistantCreatedAt,
          };
          conv = replaceLastTurn(conv, finalTurn);
          upsert(conv);
        } catch {
          const assistant: ChatTurn = {
            id: uid(),
            role: 'assistant',
            text: 'Something went wrong. Please try again.',
            createdAt: Date.now(),
          };
          conv = { ...conv, turns: [...conv.turns, assistant], updatedAt: Date.now() };
          upsert(conv);
        } finally {
          setPending((p) => ({ ...p, [convId]: false }));
          setStreaming((s) => ({ ...s, [convId]: false }));
          clearProgress(convId);
        }
      })();

      return convId;
    },
    [applyAgentEvent, clearProgress, corpus, templatedAnswer, upsert],
  );

  const removeConversation = useCallback(async (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    await deleteConversation(id);
  }, []);

  const canSend = !webgpuAvailable || modelReady || modelFailed;

  const value = useMemo<ChatContextValue>(
    () => ({
      corpus,
      ready,
      conversations,
      pending,
      streaming,
      agentProgress,
      webgpuAvailable,
      modelLoading,
      modelReady,
      modelFailed,
      modelProgress: model.progress,
      modelStatus: model.label,
      canSend,
      send,
      removeConversation,
    }),
    [
      corpus,
      ready,
      conversations,
      pending,
      streaming,
      agentProgress,
      webgpuAvailable,
      modelLoading,
      modelReady,
      modelFailed,
      model.progress,
      model.label,
      canSend,
      send,
      removeConversation,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
