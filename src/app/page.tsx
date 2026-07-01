import { MpTable } from '@/components/mp-table';
import { PartyChart } from '@/components/party-chart';
import { Reveal } from '@/components/reveal';
import { ShaderBackground } from '@/components/shaders/shader-background';
import { StatCard } from '@/components/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoteList } from '@/components/vote-list';
import { countByParty, getBills, getMps, getVotes } from '@/lib/data';

export default async function Home() {
  const [mpsData, billsData, votesData] = await Promise.all([getMps(), getBills(), getVotes()]);
  const mps = mpsData.records;
  const bills = billsData.records;
  const votes = votesData.records;
  const parties = countByParty(mps);

  const lastUpdated = [mpsData, billsData, votesData]
    .map((d) => d.meta.collectedAt)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <>
      <ShaderBackground />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 sm:px-10">
        <Reveal>
          <header className="flex flex-col gap-3">
            <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
              New Zealand · Public political data
            </span>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Politicians Tracker
            </h1>
            <p className="text-muted-foreground max-w-2xl text-balance">
              A local, JSON-backed database of MPs, bills, and voting records for data analysis.
              Refresh anytime with <code className="text-foreground">pnpm data:collect</code>.
            </p>
          </header>
        </Reveal>

        <Reveal delay={0.08}>
          <section className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="MPs tracked" value={mps.length} hint="Current & former" />
            <StatCard label="Bills" value={bills.length} hint="With recorded votes" />
            <StatCard label="Divisions" value={votes.length} hint="Recorded personal votes" />
            <StatCard label="Parties" value={parties.length} hint="Distinct affiliations" />
          </section>
        </Reveal>

        <Reveal delay={0.16}>
          <section className="mt-8 grid gap-4 lg:grid-cols-2">
            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>MPs by party</CardTitle>
                <CardDescription>Distribution across canonical party names</CardDescription>
              </CardHeader>
              <CardContent>
                <PartyChart data={parties} />
              </CardContent>
            </Card>

            <Card className="bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Explore the data</CardTitle>
                <CardDescription>Browse MPs, bills, and recent divisions</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="mps">
                  <TabsList>
                    <TabsTrigger value="mps">MPs</TabsTrigger>
                    <TabsTrigger value="votes">Votes</TabsTrigger>
                    <TabsTrigger value="bills">Bills</TabsTrigger>
                  </TabsList>
                  <TabsContent value="mps" className="mt-4">
                    <MpTable mps={mps} />
                  </TabsContent>
                  <TabsContent value="votes" className="mt-4 max-h-[28rem] overflow-y-auto pr-1">
                    <VoteList votes={votes} bills={bills} />
                  </TabsContent>
                  <TabsContent value="bills" className="mt-4 flex flex-col gap-2">
                    {bills.map((bill) => (
                      <Card key={bill.billId} className="bg-card/60 py-4">
                        <CardContent className="flex flex-col gap-1">
                          <p className="text-sm font-medium">{bill.title}</p>
                          {bill.abstract ? (
                            <p className="text-muted-foreground line-clamp-2 text-xs">
                              {bill.abstract}
                            </p>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </section>
        </Reveal>

        <footer className="text-muted-foreground mt-16 flex flex-wrap items-center justify-between gap-2 border-t pt-6 text-xs">
          <span>
            Source: voted.nz (CC-BY 4.0), based on Office of the Clerk / Parliamentary Service data.
          </span>
          {lastUpdated ? (
            <span>Updated {new Date(lastUpdated).toLocaleString('en-NZ')}</span>
          ) : (
            <span>Run pnpm data:collect to populate data.</span>
          )}
        </footer>
      </main>
    </>
  );
}
