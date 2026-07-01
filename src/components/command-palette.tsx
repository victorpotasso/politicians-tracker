'use client';

import {
  BarChart3,
  FileText,
  Flag,
  Info,
  Landmark,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Search,
  Users,
  Vote,
  Wallet,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export type CommandType = 'page' | 'politician' | 'party' | 'bill';

export interface CommandEntity {
  id: string;
  type: CommandType;
  title: string;
  subtitle?: string;
  href: string;
  /** Extra terms to match against, whitespace-joined. */
  keywords?: string;
  /** Accent colour (e.g. party brand) for the leading dot. */
  color?: string;
}

const PAGES: CommandEntity[] = [
  { id: 'page:dashboard', type: 'page', title: 'Dashboard', subtitle: 'Overview', href: '/' },
  {
    id: 'page:politicians',
    type: 'page',
    title: 'Politicians',
    subtitle: 'Members of Parliament',
    href: '/politicians',
    keywords: 'mps members',
  },
  {
    id: 'page:parties',
    type: 'page',
    title: 'Parties',
    subtitle: 'Political parties',
    href: '/parties',
  },
  {
    id: 'page:parliament',
    type: 'page',
    title: 'Parliament',
    subtitle: 'Composition & seats',
    href: '/parliament',
    keywords: 'hemicycle seats',
  },
  {
    id: 'page:bills',
    type: 'page',
    title: 'Bills',
    subtitle: 'Legislation & votes',
    href: '/bills',
    keywords: 'legislation votes divisions',
  },
  {
    id: 'page:polls',
    type: 'page',
    title: 'Polls',
    subtitle: 'Opinion polling',
    href: '/polls',
    keywords: 'polling surveys',
  },
  {
    id: 'page:spending',
    type: 'page',
    title: 'Spending',
    subtitle: 'Crown expenses',
    href: '/spending',
    keywords: 'money expenses budget treasury',
  },
  {
    id: 'page:analytics',
    type: 'page',
    title: 'Analytics',
    subtitle: 'Cross-cutting analysis',
    href: '/analytics',
    keywords: 'insights money politicians parties bills scrutiny outliers anomalies',
  },
  {
    id: 'page:chat',
    type: 'page',
    title: 'Ask AI',
    subtitle: 'Chat with the data',
    href: '/chat',
    keywords: 'assistant ai chatbot',
  },
  { id: 'page:about', type: 'page', title: 'About', subtitle: 'Sources & method', href: '/about' },
];

const PAGE_ICONS: Record<string, typeof LayoutDashboard> = {
  '/': LayoutDashboard,
  '/politicians': Users,
  '/parties': Flag,
  '/parliament': Landmark,
  '/bills': FileText,
  '/polls': BarChart3,
  '/spending': Wallet,
  '/analytics': LineChart,
  '/chat': MessageSquare,
  '/about': Info,
};

const TYPE_META: Record<CommandType, { label: string; icon: typeof Users }> = {
  page: { label: 'Pages', icon: LayoutDashboard },
  politician: { label: 'Politicians', icon: Users },
  party: { label: 'Parties', icon: Flag },
  bill: { label: 'Bills', icon: Vote },
};

const GROUP_ORDER: CommandType[] = ['page', 'politician', 'party', 'bill'];
const MAX_PER_GROUP = 6;

function normalise(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Simple substring score: earlier matches and title hits rank higher. */
function score(entity: CommandEntity, query: string): number {
  const haystack = normalise(`${entity.title} ${entity.subtitle ?? ''} ${entity.keywords ?? ''}`);
  const idx = haystack.indexOf(query);
  if (idx === -1) return -1;
  const titleIdx = normalise(entity.title).indexOf(query);
  return (titleIdx === 0 ? 0 : titleIdx > 0 ? 100 : 300) + idx;
}

export function CommandPalette({ entities }: { entities: CommandEntity[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();

  const all = useMemo(() => [...PAGES, ...entities], [entities]);

  const results = useMemo(() => {
    const q = normalise(query.trim());
    const byGroup = new Map<CommandType, CommandEntity[]>();

    if (!q) {
      for (const type of GROUP_ORDER) byGroup.set(type, []);
      for (const item of all) {
        const bucket = byGroup.get(item.type);
        if (bucket && bucket.length < (item.type === 'page' ? PAGES.length : MAX_PER_GROUP)) {
          bucket.push(item);
        }
      }
    } else {
      const scored = all
        .map((item) => ({ item, s: score(item, q) }))
        .filter((x) => x.s >= 0)
        .sort((a, b) => a.s - b.s);
      for (const type of GROUP_ORDER) byGroup.set(type, []);
      for (const { item } of scored) {
        const bucket = byGroup.get(item.type);
        if (bucket && bucket.length < MAX_PER_GROUP) bucket.push(item);
      }
    }

    const groups = GROUP_ORDER.map((type) => ({ type, items: byGroup.get(type) ?? [] })).filter(
      (g) => g.items.length > 0,
    );
    const flat = groups.flatMap((g) => g.items);
    return { groups, flat };
  }, [all, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  // Global Cmd/Ctrl+K shortcut.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Allow other UI (e.g. the nav button) to open the palette.
  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener('command-palette:open', onOpen);
    return () => window.removeEventListener('command-palette:open', onOpen);
  }, []);

  // Close on navigation.
  // biome-ignore lint/correctness/useExhaustiveDependencies: close on route change only.
  useEffect(() => {
    close();
  }, [pathname]);

  // Focus input & lock scroll while open.
  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  // Keep the active item within the flat result range.
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, results.flat.length - 1)));
  }, [results.flat.length]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % Math.max(1, results.flat.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + results.flat.length) % Math.max(1, results.flat.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = results.flat[activeIndex];
      if (target) go(target.href);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  // Scroll the active option into view.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  let flatIndex = -1;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="command-palette"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] sm:pt-[16vh]"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close command palette"
            onClick={close}
            className="bg-background/60 absolute inset-0 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="border-border/60 bg-popover/95 relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl"
          >
            <div className="border-border/50 flex items-center gap-3 border-b px-4">
              <Search className="text-muted-foreground size-4 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                placeholder="Search politicians, parties, bills, pages…"
                className="placeholder:text-muted-foreground h-12 w-full bg-transparent text-sm outline-none"
              />
              <kbd className="text-muted-foreground border-border/60 hidden rounded border px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
                ESC
              </kbd>
            </div>

            <div
              ref={listRef}
              id={listId}
              role="listbox"
              className="max-h-[52vh] overflow-y-auto p-2"
            >
              {results.flat.length === 0 ? (
                <div className="text-muted-foreground px-3 py-10 text-center text-sm">
                  No results for “{query.trim()}”.
                </div>
              ) : (
                results.groups.map((group) => {
                  const Meta = TYPE_META[group.type];
                  return (
                    <div key={group.type} className="mb-1 last:mb-0">
                      <div className="text-muted-foreground px-2 py-1.5 text-[11px] font-medium tracking-wide uppercase">
                        {Meta.label}
                      </div>
                      {group.items.map((item) => {
                        flatIndex += 1;
                        const index = flatIndex;
                        const active = index === activeIndex;
                        const Icon =
                          item.type === 'page'
                            ? (PAGE_ICONS[item.href] ?? LayoutDashboard)
                            : Meta.icon;
                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            data-index={index}
                            role="option"
                            aria-selected={active}
                            onMouseMove={() => setActiveIndex(index)}
                            onClick={close}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
                              active ? 'bg-accent text-accent-foreground' : 'text-foreground/90',
                            )}
                          >
                            <span
                              className="border-border/60 bg-background/60 grid size-7 shrink-0 place-items-center rounded-md border"
                              style={item.color ? { color: item.color } : undefined}
                            >
                              {item.color ? (
                                <span
                                  className="size-2.5 rounded-full"
                                  style={{ background: item.color }}
                                />
                              ) : (
                                <Icon className="size-4" />
                              )}
                            </span>
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate font-medium">{item.title}</span>
                              {item.subtitle ? (
                                <span className="text-muted-foreground truncate text-xs">
                                  {item.subtitle}
                                </span>
                              ) : null}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-border/50 text-muted-foreground flex items-center gap-4 border-t px-4 py-2 text-[11px]">
              <span className="flex items-center gap-1">
                <kbd className="border-border/60 rounded border px-1 py-0.5">↑</kbd>
                <kbd className="border-border/60 rounded border px-1 py-0.5">↓</kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="border-border/60 rounded border px-1 py-0.5">↵</kbd>
                to open
              </span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
