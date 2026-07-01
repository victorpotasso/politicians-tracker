'use client';

import { ArrowUpRight, Building2, FileText, TrendingUp, User } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import type { ChatDoc, SearchGroup } from '@/lib/chat/types';
import { cn } from '@/lib/utils';

interface GroupStyle {
  gradient: string;
  icon: typeof User;
  glow: string;
}

const STYLES: Record<SearchGroup, GroupStyle> = {
  person: {
    gradient: 'from-indigo-500 to-violet-500',
    icon: User,
    glow: 'bg-violet-500',
  },
  party: {
    gradient: 'from-sky-500 to-blue-500',
    icon: Building2,
    glow: 'bg-sky-500',
  },
  bill: {
    gradient: 'from-amber-500 to-orange-500',
    icon: FileText,
    glow: 'bg-amber-500',
  },
  poll: {
    gradient: 'from-fuchsia-500 to-rose-500',
    icon: TrendingUp,
    glow: 'bg-fuchsia-500',
  },
};

interface EntityCardProps {
  doc: ChatDoc;
  index?: number;
}

export function EntityCard({ doc, index = 0 }: EntityCardProps) {
  const style = STYLES[doc.group];
  const Icon = style.icon;
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = doc.group === 'person' && doc.image && !imgFailed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.3 }}
    >
      <Link
        href={doc.href}
        className="group/card border-border/50 bg-card/60 relative flex items-start gap-3 overflow-hidden rounded-2xl border p-3 backdrop-blur-xl transition-colors hover:border-violet-400/50"
      >
        <span
          className={cn(
            'pointer-events-none absolute -right-6 -top-6 size-28 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover/card:opacity-40',
            style.glow,
          )}
        />
        <span className={cn('absolute inset-x-0 top-0 h-0.5 bg-linear-to-r', style.gradient)} />

        {showImage ? (
          // biome-ignore lint/performance/noImgElement: local static portrait, no next/image domain config.
          <img
            src={doc.image}
            alt={doc.title}
            onError={() => setImgFailed(true)}
            className="size-11 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <span
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br text-white',
              style.gradient,
            )}
          >
            <Icon className="size-5" />
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="truncate text-sm font-semibold">{doc.title}</span>
            <ArrowUpRight className="text-muted-foreground size-3.5 shrink-0 -translate-x-1 opacity-0 transition-all group-hover/card:translate-x-0 group-hover/card:opacity-100" />
          </span>
          <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs leading-relaxed">
            {doc.lead}
          </span>
        </span>
      </Link>
    </motion.div>
  );
}
