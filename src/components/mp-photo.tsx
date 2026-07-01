'use client';

import Image from 'next/image';
import { useState } from 'react';
import { partyColor } from '@/lib/party';
import { cn } from '@/lib/utils';
import type { MP } from '@/types/records';

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface MpPhotoProps {
  mp: Pick<MP, 'mpId' | 'name' | 'party' | 'photoUrl'>;
  size?: number;
  className?: string;
  priority?: boolean;
}

/**
 * MP portrait sourced from the local public/politicians folder. Falls back to
 * party-tinted initials when the photo is missing or fails to load.
 */
export function MpPhoto({ mp, size = 96, className, priority }: MpPhotoProps) {
  const [failed, setFailed] = useState(false);
  const src = `/politicians/${mp.mpId}.jpg`;
  const color = partyColor(mp.party);

  return (
    <div
      className={cn('relative overflow-hidden rounded-xl', className)}
      style={{
        width: size,
        height: size,
        boxShadow: `inset 0 0 0 2px ${color}`,
        background: failed ? `linear-gradient(145deg, ${color}33, ${color}0d)` : 'var(--muted)',
      }}
    >
      {failed ? (
        <span
          className="grid h-full w-full place-items-center font-semibold"
          style={{ fontSize: size * 0.34, color }}
        >
          {initials(mp.name)}
        </span>
      ) : (
        <Image
          src={src}
          alt={mp.name}
          width={size}
          height={size}
          priority={priority}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
