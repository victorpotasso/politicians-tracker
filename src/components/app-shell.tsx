'use client';

import {
  Banknote,
  FileText,
  Info,
  Landmark,
  LayoutDashboard,
  LineChart,
  type LucideIcon,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  Users,
  Vote,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type CSSProperties, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const PRIMARY_NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/politicians', label: 'Politicians', icon: Users },
  { href: '/parties', label: 'Parties', icon: Vote },
  { href: '/parliament', label: 'Parliament', icon: Landmark },
  { href: '/bills', label: 'Bills', icon: FileText },
  { href: '/polls', label: 'Polls', icon: LineChart },
  { href: '/spending', label: 'Spending', icon: Banknote },
];

const SECONDARY_NAV: NavItem[] = [
  { href: '/chat', label: 'Ask AI', icon: Sparkles },
  { href: '/about', label: 'About', icon: Info },
];

const COLLAPSED_WIDTH = '4.75rem';
const EXPANDED_WIDTH = '16rem';
const STORAGE_KEY = 'sidebar-collapsed';

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/** The gradient "NZ" badge used as the app mark. */
function BrandBadge() {
  return (
    <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg text-[11px] font-bold text-white">
      <span className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-teal-400" />
      <span className="relative">NZ</span>
    </span>
  );
}

function Wordmark() {
  return (
    <span className="text-sm font-semibold tracking-tight whitespace-nowrap">
      Politicians<span className="text-muted-foreground"> Tracker</span>
    </span>
  );
}

interface NavLinkProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  layoutId: string;
  onNavigate?: () => void;
}

function NavLink({ item, active, collapsed, layoutId, onNavigate }: NavLinkProps) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        collapsed && 'justify-center px-0',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {active ? (
        <motion.span
          layoutId={layoutId}
          className="bg-secondary ring-border/60 absolute inset-0 -z-10 rounded-lg ring-1"
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        />
      ) : null}
      <Icon
        className={cn(
          'size-[1.15rem] shrink-0 transition-colors',
          active ? 'text-brand' : 'text-muted-foreground group-hover:text-foreground',
        )}
      />
      {!collapsed ? <span className="truncate">{item.label}</span> : null}
    </Link>
  );
}

interface SidebarBodyProps {
  pathname: string;
  collapsed: boolean;
  layoutId: string;
  onNavigate?: () => void;
}

/** The scrollable list of nav sections shared by the desktop rail and mobile drawer. */
function SidebarNav({ pathname, collapsed, layoutId, onNavigate }: SidebarBodyProps) {
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
      {PRIMARY_NAV.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isActive(pathname, item.href)}
          collapsed={collapsed}
          layoutId={layoutId}
          onNavigate={onNavigate}
        />
      ))}
      <div className="bg-border/60 my-2 h-px" aria-hidden />
      {SECONDARY_NAV.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isActive(pathname, item.href)}
          collapsed={collapsed}
          layoutId={layoutId}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}

function openCommandPalette() {
  window.dispatchEvent(new Event('command-palette:open'));
}

/**
 * App shell with a rad, collapsible sidebar navigation. On desktop it renders a
 * fixed rail that collapses to an icon-only strip (persisted to localStorage);
 * on mobile it becomes a hamburger-triggered slide-in drawer.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore the persisted collapsed state after mount (avoids hydration drift).
  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
  }, []);

  // Close the mobile drawer whenever the route changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const toggleCollapsed = () =>
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      return next;
    });

  const rootStyle = { '--sb-w': collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH } as CSSProperties;

  return (
    <div style={rootStyle}>
      {/* Desktop rail */}
      <aside
        className="border-border/40 bg-background/60 fixed inset-y-0 left-0 z-40 hidden flex-col backdrop-blur-xl transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:flex"
        style={{ width: 'var(--sb-w)' }}
      >
        <div className="flex h-16 items-center gap-2.5 px-4">
          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden"
            aria-label="Politicians Tracker home"
          >
            <BrandBadge />
            {!collapsed ? <Wordmark /> : null}
          </Link>
          {!collapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              className="text-muted-foreground hover:bg-secondary hover:text-foreground grid size-8 shrink-0 place-items-center rounded-md transition-colors"
            >
              <PanelLeftClose className="size-[1.1rem]" />
            </button>
          ) : null}
        </div>

        {collapsed ? (
          <div className="flex justify-center pb-1">
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expand sidebar"
              className="text-muted-foreground hover:bg-secondary hover:text-foreground grid size-8 place-items-center rounded-md transition-colors"
            >
              <PanelLeftOpen className="size-[1.1rem]" />
            </button>
          </div>
        ) : null}

        <SidebarNav pathname={pathname} collapsed={collapsed} layoutId="sidebar-pill-desktop" />

        <div className="border-border/40 border-t p-3">
          <button
            type="button"
            onClick={openCommandPalette}
            title={collapsed ? 'Search (⌘K)' : undefined}
            className={cn(
              'text-muted-foreground hover:bg-secondary hover:text-foreground flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              collapsed && 'justify-center px-0',
            )}
          >
            <Search className="size-[1.15rem] shrink-0" />
            {!collapsed ? (
              <>
                <span>Search</span>
                <kbd className="border-border/60 text-muted-foreground ml-auto rounded border px-1.5 py-0.5 font-mono text-[10px]">
                  ⌘K
                </kbd>
              </>
            ) : null}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="border-border/40 bg-background/70 supports-[backdrop-filter]:bg-background/50 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-xl md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="text-muted-foreground hover:bg-secondary hover:text-foreground -ml-2 grid size-9 place-items-center rounded-md transition-colors"
        >
          <Menu className="size-5" />
        </button>
        <Link href="/" className="flex items-center gap-2.5" aria-label="Politicians Tracker home">
          <BrandBadge />
          <Wordmark />
        </Link>
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Search"
          className="text-muted-foreground hover:bg-secondary hover:text-foreground ml-auto grid size-9 place-items-center rounded-md transition-colors"
        >
          <Search className="size-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <motion.aside
              key="drawer"
              className="border-border/40 bg-background/95 fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r backdrop-blur-xl md:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
              <div className="flex h-14 items-center gap-2.5 px-4">
                <BrandBadge />
                <Wordmark />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation menu"
                  className="text-muted-foreground hover:bg-secondary hover:text-foreground ml-auto grid size-9 place-items-center rounded-md transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>
              <SidebarNav
                pathname={pathname}
                collapsed={false}
                layoutId="sidebar-pill-mobile"
                onNavigate={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      {/* Content */}
      <div className="flex min-h-svh flex-col transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:pl-[var(--sb-w)]">
        {children}
      </div>
    </div>
  );
}
