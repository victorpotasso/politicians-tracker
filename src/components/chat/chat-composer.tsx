'use client';

import { Loader2, SendHorizonal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useChat } from './chat-provider';

interface ChatComposerProps {
  onSend: (text: string) => void;
}

export function ChatComposer({ onSend }: ChatComposerProps) {
  const { canSend, modelLoading, modelProgress, modelStatus, webgpuAvailable } = useChat();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const waitingForModel = !canSend;
  const percent = Math.round(modelProgress * 100);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when the text changes.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || waitingForModel) return;
    onSend(text);
    setValue('');
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      {modelLoading ? (
        <div className="text-muted-foreground mb-2 flex items-center gap-2 px-2 text-xs">
          <Loader2 className="size-3.5 animate-spin" />
          <span>Loading the AI model… {percent}%</span>
          {modelStatus ? <span className="truncate text-white/40">· {modelStatus}</span> : null}
        </div>
      ) : null}

      <div className="border-border/50 bg-card/50 focus-within:border-violet-400/60 focus-within:ring-violet-500/15 relative flex items-end gap-2 rounded-[1.75rem] border p-2 pl-4 shadow-2xl shadow-black/10 backdrop-blur-2xl transition-all focus-within:ring-4">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          disabled={waitingForModel}
          placeholder={
            waitingForModel
              ? 'Preparing the local model — one moment…'
              : 'Ask about an MP, party, bill or recent poll…'
          }
          className="max-h-[200px] flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={waitingForModel || value.trim().length === 0}
          aria-label="Send"
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30 transition-all',
            'hover:scale-105 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100',
          )}
        >
          <SendHorizonal className="size-4" />
        </button>
      </div>

      {!webgpuAvailable ? (
        <p className="mt-2 px-2 text-center text-xs text-amber-500/80">
          AI answers need WebGPU — try Chrome or Edge. Using keyword search for now.
        </p>
      ) : null}
    </div>
  );
}
