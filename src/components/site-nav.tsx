'use client';

import { Search } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/about', label: 'About' },
  { href: '/', label: 'Dashboard' },
  { href: '/bills', label: 'Bills' },
  { href: '/politicians', label: 'Politicians' },
  { href: '/parliament', label: 'Parliament' },
  { href: '/parties', label: 'Parties' },
  { href: '/polls', label: 'Polls' },
  { href: '/spending', label: 'Spending' },
  { href: '/chat', label: 'Ask AI' },
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
              return (
                <li key={link.href} className="relative">
                  <Link
                    href={link.href}
                    className={cn(
                      'relative block rounded-full px-3 py-1.5 whitespace-nowrap transition-colors',
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
