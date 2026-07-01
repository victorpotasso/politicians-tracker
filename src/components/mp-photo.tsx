import Image from 'next/image';
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
 * MP portrait sourced from the local public/politicians folder, falling back to
 * party-tinted initials when no photo is available.
 */
export function MpPhoto({ mp, size = 96, className, priority }: MpPhotoProps) {
  const src = `/politicians/${mp.mpId}.jpg`;
  const hasPhoto = Boolean(mp.photoUrl);

  return (
    <div
      className={cn(
        'bg-muted text-muted-foreground relative overflow-hidden rounded-xl',
        className,
      )}
      style={{
        width: size,
        height: size,
        boxShadow: `inset 0 0 0 2px ${partyColor(mp.party)}`,
      }}
    >
      {hasPhoto ? (
        <Image
          src={src}
          alt={mp.name}
          width={size}
          height={size}
          priority={priority}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="grid h-full w-full place-items-center text-lg font-semibold">
          {initials(mp.name)}
        </span>
      )}
    </div>
  );
}
