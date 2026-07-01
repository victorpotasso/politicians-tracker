'use client';

import { motion, useReducedMotion } from 'motion/react';
import { memo } from 'react';
import { cn } from '@/lib/utils';

// Hoisted config — passing fresh objects to motion restarts the loops.
const SPIN = { rotate: 360 };
const SPIN_BACK = { rotate: -360 };
const PULSE = { scale: [1, 1.18, 1], opacity: [0.8, 1, 0.8] };
const HALO_T = { duration: 14, ease: 'linear', repeat: Number.POSITIVE_INFINITY } as const;
const SHELL_T = { duration: 10, ease: 'linear', repeat: Number.POSITIVE_INFINITY } as const;
const CORE_T = { duration: 1.6, ease: 'easeInOut', repeat: Number.POSITIVE_INFINITY } as const;

interface AssistantOrbProps {
  pulsing?: boolean;
  className?: string;
}

function AssistantOrbBase({ pulsing = false, className }: AssistantOrbProps) {
  const reduce = useReducedMotion();
  return (
    <div className={cn('relative shrink-0 rounded-full', className)}>
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full opacity-70 blur-[6px]"
        style={{
          background: 'conic-gradient(from 0deg, #6366f1, #db2777, #06b6d4, #a855f7, #6366f1)',
        }}
        animate={reduce ? undefined : SPIN}
        transition={reduce ? undefined : HALO_T}
      />
      <motion.span
        aria-hidden
        className="absolute inset-[12%] rounded-full"
        style={{
          background: 'conic-gradient(from 180deg, #22d3ee, #818cf8, #f472b6, #22d3ee)',
        }}
        animate={reduce ? undefined : SPIN_BACK}
        transition={reduce ? undefined : SHELL_T}
      />
      <span className="absolute inset-[22%] rounded-full bg-white/20 backdrop-blur-sm" />
      <motion.span
        aria-hidden
        className="absolute inset-[30%] rounded-full bg-linear-to-br from-white/90 to-white/30 mix-blend-overlay"
        animate={reduce || !pulsing ? undefined : PULSE}
        transition={reduce || !pulsing ? undefined : CORE_T}
      />
      <span className="absolute left-[26%] top-[22%] size-[18%] rounded-full bg-white/80 blur-[1px]" />
    </div>
  );
}

export const AssistantOrb = memo(AssistantOrbBase);
