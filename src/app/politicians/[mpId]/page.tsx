import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { MpPhoto } from '@/components/mp-photo';
import { Reveal } from '@/components/reveal';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { getMp, getMps } from '@/lib/data';
import { partyColor } from '@/lib/party';

interface Params {
  params: Promise<{ mpId: string }>;
}

export async function generateStaticParams() {
  const { records } = await getMps();
  return records.map((mp) => ({ mpId: mp.mpId }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { mpId } = await params;
  const mp = await getMp(mpId);
  if (!mp) return { title: 'Politician not found' };
  return {
    title: `${mp.name} · NZ Politicians Tracker`,
    description: `Profile for ${mp.name}${mp.party ? `, ${mp.party}` : ''}.`,
  };
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs tracking-wide uppercase">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function PoliticianProfilePage({ params }: Params) {
  const { mpId } = await params;
  const mp = await getMp(mpId);
  if (!mp) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12 sm:px-10">
      <Reveal>
        <Link href="/politicians" className="text-muted-foreground hover:text-foreground text-sm">
          ← All politicians
        </Link>
      </Reveal>

      <Reveal delay={0.06} className="mt-6">
        <Card className="bg-card/60 backdrop-blur-sm">
          <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <MpPhoto mp={mp} size={160} priority className="shrink-0" />
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight">{mp.name}</h1>
                  {mp.party ? (
                    <Badge
                      style={{ backgroundColor: partyColor(mp.party), color: '#fff' }}
                      className="border-transparent"
                    >
                      {mp.party}
                    </Badge>
                  ) : null}
                </div>
                {mp.role ? <p className="text-muted-foreground">{mp.role}</p> : null}
              </div>

              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Detail label="Party" value={mp.party ?? 'Unaligned'} />
                <Detail label="Electorate" value={mp.electorate ?? '—'} />
                <Detail label="Title" value={mp.role ?? '—'} />
              </dl>

              {mp.profileUrl ? (
                <a
                  href={mp.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary w-fit text-sm underline underline-offset-4"
                >
                  Voting record on voted.nz ↗
                </a>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal delay={0.12} className="mt-6">
        <p className="text-muted-foreground text-xs">
          Source: {mp.sourceUrl} · fetched {new Date(mp.fetchedAt).toLocaleDateString('en-NZ')}
        </p>
      </Reveal>
    </main>
  );
}
