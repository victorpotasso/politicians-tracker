'use client';

import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  FileText,
  Flag,
  Info,
  Landmark,
  LayoutDashboard,
  MessageSquare,
  Search,
  Users,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const LINKS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: '/about', label: 'About', icon: Info },
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/bills', label: 'Bills', icon: FileText },
  { href: '/politicians', label: 'Politicians', icon: Users },
  { href: '/parliament', label: 'Parliament', icon: Landmark },
  { href: '/parties', label: 'Parties', icon: Flag },
  { href: '/polls', label: 'Polls', icon: BarChart3 },
  { href: '/spending', label: 'Spending', icon: Wallet },
  { href: '/chat', label: 'Ask AI', icon: MessageSquare },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

function CommandTrigger() {
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(/mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent));
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('command-palette:open'))}
      aria-label="Open command palette"
      className="text-muted-foreground hover:text-foreground border-border/60 bg-background/50 hover:bg-secondary flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-sm transition-colors"
    >
      <Search className="size-4" />
      <span className="hidden sm:inline">Search</span>
      <kbd className="border-border/60 bg-background/60 hidden rounded border px-1 py-0.5 text-[10px] font-medium sm:inline-block">
        {isMac ? '⌘' : 'Ctrl'} K
      </kbd>
    </button>
  );
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30">
      <div className="border-border/40 bg-background/70 supports-[backdrop-filter]:bg-background/50 border-b backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3 sm:px-10">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="relative grid size-7 place-items-center overflow-hidden rounded-lg text-[11px] font-bold text-white">
              <span className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-teal-400" />
              <span className="relative">NZ</span>
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Politicians<span className="text-muted-foreground"> Tracker</span>
            </span>
          </Link>

          <ul className="flex items-center gap-0.5 overflow-x-auto text-sm">
            {LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              const Icon = link.icon;
              return (
                <li key={link.href} className="relative">
                  <Link
                    href={link.href}
                    className={cn(
                      'relative flex items-center gap-1.5 rounded-full px-3 py-1.5 whitespace-nowrap transition-colors',
                      active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {active ? (
                      <motion.span
                        layoutId="nav-pill"
                        className="bg-secondary absolute inset-0 -z-10 rounded-full"
                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      />
                    ) : null}
                    <Icon className="size-3.5 shrink-0" aria-hidden />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <CommandTrigger />
        </nav>
      </div>
    </header>
  );
}
