'use client';

import { History, PanelRightOpen, Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ChatAurora } from './chat-aurora';
import { ChatPreloader } from './chat-preloader';
import { ConversationRail } from './conversation-rail';

export function ChatWorkspace({ children }: { children: ReactNode }) {
  const [historyOpen, setHistoryOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="relative isolate h-[calc(100svh-3.25rem)] w-full overflow-hidden">
      <ChatAurora className="-z-10 opacity-90" />
      <div className="bg-background/55 pointer-events-none absolute inset-0 -z-10" />
      <ChatPreloader />

      <div className="flex h-full w-full overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <div className="border-border/40 flex items-center justify-between border-b px-4 py-2 md:hidden">
            <Link
              href="/chat"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
            >
              <Plus className="size-4" />
              New
            </Link>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
            >
              <History className="size-4" />
              History
            </button>
          </div>
          {children}
        </div>

        {historyOpen ? (
          <aside className="border-border/40 bg-background/30 hidden w-72 shrink-0 flex-col border-l backdrop-blur-2xl md:flex lg:w-80">
            <ConversationRail onCollapse={() => setHistoryOpen(false)} />
          </aside>
        ) : (
          <button
            type="button"
            aria-label="Expand history"
            title="Expand history"
            onClick={() => setHistoryOpen(true)}
            className="border-border/50 bg-background/80 text-muted-foreground hover:text-foreground absolute right-4 top-4 z-30 hidden rounded-full border p-2 shadow-sm backdrop-blur-xl transition-colors md:inline-flex"
          >
            <PanelRightOpen className="size-4" />
          </button>
        )}
      </div>

      {/* Mobile history drawer */}
      <AnimatePresence>
        {sheetOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="border-border/40 bg-background/95 absolute inset-y-0 right-0 z-40 flex w-72 flex-col border-l backdrop-blur-2xl md:hidden"
            >
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground absolute right-3 top-3.5 z-10"
              >
                <X className="size-4" />
              </button>
              <ConversationRail onNavigate={() => setSheetOpen(false)} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
