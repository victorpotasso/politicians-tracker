'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/politicians', label: 'Politicians' },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="border-border/50 bg-background/60 sticky top-0 z-20 border-b backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3 sm:px-10">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="bg-primary text-primary-foreground grid size-6 place-items-center rounded-md text-xs">
            NZ
          </span>
          Politicians Tracker
        </Link>
        <ul className="flex items-center gap-1 text-sm">
          {LINKS.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'rounded-md px-3 py-1.5 transition-colors',
                    active
                      ? 'bg-secondary text-secondary-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
