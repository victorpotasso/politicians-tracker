'use client';

import { Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Conversation } from '@/lib/chat/types';
import { cn } from '@/lib/utils';
import { useChat } from './chat-provider';

function bucketOf(updatedAt: number): 'today' | 'yesterday' | 'earlier' {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  if (updatedAt >= startOfToday) return 'today';
  if (updatedAt >= startOfYesterday) return 'yesterday';
  return 'earlier';
}

const BUCKET_LABELS: Record<string, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  earlier: 'Earlier',
};

export function ConversationRail({ onNavigate }: { onNavigate?: () => void }) {
  const { conversations, removeConversation } = useChat();
  const pathname = usePathname();
  const router = useRouter();
  const activeId = pathname.startsWith('/chat/c/') ? pathname.split('/').pop() : null;

  const buckets: Record<string, Conversation[]> = { today: [], yesterday: [], earlier: [] };
  for (const conv of conversations) buckets[bucketOf(conv.updatedAt)].push(conv);

  const handleDelete = async (id: string) => {
    await removeConversation(id);
    if (id === activeId) router.push('/chat');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-border/40 flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm font-semibold">History</span>
        <Link
          href="/chat"
          onClick={onNavigate}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-full border border-border/50 px-2.5 py-1 text-xs transition-colors"
        >
          <Plus className="size-3.5" />
          New chat
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center text-xs">
            Your conversations will appear here.
          </p>
        ) : (
          (['today', 'yesterday', 'earlier'] as const).map((key) =>
            buckets[key].length > 0 ? (
              <div key={key} className="mb-3">
                <p className="text-muted-foreground px-3 py-1 text-[0.7rem] font-medium uppercase tracking-wide">
                  {BUCKET_LABELS[key]}
                </p>
                <ul className="space-y-0.5">
                  {buckets[key].map((conv) => {
                    const active = conv.id === activeId;
                    return (
                      <li key={conv.id} className="group/item relative">
                        <Link
                          href={`/chat/c/${conv.id}`}
                          onClick={onNavigate}
                          className={cn(
                            'block truncate rounded-lg px-3 py-2 pr-8 text-sm transition-colors',
                            active
                              ? 'bg-secondary text-foreground'
                              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                          )}
                        >
                          {conv.title}
                        </Link>
                        <button
                          type="button"
                          aria-label="Delete conversation"
                          onClick={() => handleDelete(conv.id)}
                          className="text-muted-foreground hover:text-destructive absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 opacity-0 transition-opacity group-hover/item:opacity-100 focus-visible:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null,
          )
        )}
      </div>
    </div>
  );
}
