import { Flag, Landmark } from 'lucide-react';
import Link from 'next/link';

import { MpPhoto } from '@/components/mp-photo';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { MP } from '@/types/records';

export function MpCard({ mp }: { mp: MP }) {
  return (
    <Link href={`/politicians/${mp.mpId}`} className="group rounded-xl focus-visible:outline-none">
      <Card className="interactive-card bg-card/60 flex-row items-center gap-4 p-4 py-4 backdrop-blur-sm">
        <MpPhoto mp={mp} size={64} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {mp.role ? <span className="text-muted-foreground text-sm">{mp.role} </span> : null}
            {mp.name}
          </p>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5 truncate text-xs">
            <Landmark className="size-3.5 shrink-0" aria-hidden />
            {mp.electorate ?? '—'}
          </p>
          {mp.party ? (
            <Badge variant="secondary" className="mt-1.5">
              <Flag aria-hidden />
              {mp.party}
            </Badge>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
