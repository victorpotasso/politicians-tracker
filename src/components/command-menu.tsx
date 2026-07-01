import { type CommandEntity, CommandPalette } from '@/components/command-palette';
import { getBills, getMps, getPartySummaries } from '@/lib/data';
import { partyColor } from '@/lib/party';

/**
 * Server wrapper that builds a lightweight search index (politicians, parties,
 * bills) and hands it to the client command palette.
 */
export async function CommandMenu() {
  const [{ records: mps }, { records: bills }, parties] = await Promise.all([
    getMps(),
    getBills(),
    getPartySummaries(),
  ]);

  const entities: CommandEntity[] = [
    ...mps.map((mp) => ({
      id: `mp:${mp.mpId}`,
      type: 'politician' as const,
      title: mp.name,
      subtitle: [mp.party, mp.electorate].filter(Boolean).join(' · ') || undefined,
      href: `/politicians/${mp.mpId}`,
      keywords: [mp.party, mp.electorate, mp.role].filter(Boolean).join(' '),
      color: mp.party ? partyColor(mp.party) : undefined,
    })),
    ...parties.map((party) => ({
      id: `party:${party.slug}`,
      type: 'party' as const,
      title: party.party,
      subtitle:
        party.currentSeats != null ? `${party.currentSeats} seats` : `Peak ${party.peakSeats}`,
      href: `/parties/${party.slug}`,
      color: party.color,
    })),
    ...bills.map((bill) => ({
      id: `bill:${bill.billId}`,
      type: 'bill' as const,
      title: bill.title,
      subtitle: [bill.party, bill.stage].filter(Boolean).join(' · ') || undefined,
      href: `/bills/${bill.billId}`,
      keywords: [bill.proponentName, bill.party].filter(Boolean).join(' '),
    })),
  ];

  return <CommandPalette entities={entities} />;
}
