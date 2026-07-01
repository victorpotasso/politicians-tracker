import Link from 'next/link';

import { MpPhoto } from '@/components/mp-photo';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { MP } from '@/types/records';

export function MpCard({ mp }: { mp: MP }) {
  return (
    <Link href={`/politicians/${mp.mpId}`} className="group">
      <Card className="bg-card/60 group-hover:border-primary/40 flex-row items-center gap-4 p-4 py-4 backdrop-blur-sm transition-colors">
        <MpPhoto mp={mp} size={64} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {mp.role ? <span className="text-muted-foreground text-sm">{mp.role} </span> : null}
            {mp.name}
          </p>
          <p className="text-muted-foreground truncate text-xs">{mp.electorate ?? '—'}</p>
          {mp.party ? (
            <Badge variant="secondary" className="mt-1.5">
              {mp.party}
            </Badge>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}
