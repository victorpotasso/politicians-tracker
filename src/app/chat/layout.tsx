import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ChatProvider } from '@/components/chat/chat-provider';
import { ChatWorkspace } from '@/components/chat/chat-workspace';
import { buildChatCorpus } from '@/lib/chat/corpus';
import {
  getBills,
  getEnrichment,
  getExpenses,
  getMps,
  getPartySummaries,
  getPolls,
  getVotes,
} from '@/lib/data';

export const metadata: Metadata = {
  title: 'Ask the tracker — NZ Politicians Tracker',
  description:
    'Chat with New Zealand political data — answers grounded in real records, running entirely in your browser.',
};

export default async function ChatLayout({ children }: { children: ReactNode }) {
  const [mps, enrichment, bills, votes, expenses, polls, parties] = await Promise.all([
    getMps(),
    getEnrichment(),
    getBills(),
    getVotes(),
    getExpenses(),
    getPolls(),
    getPartySummaries(),
  ]);

  const corpus = buildChatCorpus({
    mps: mps.records,
    enrichment,
    bills: bills.records,
    votes: votes.records,
    expenses: expenses.records,
    polls: polls.records,
    parties: parties.map((p) => ({
      party: p.party,
      slug: p.slug,
      mpCount: p.mpCount,
      currentSeats: p.currentSeats,
      peakSeats: p.peakSeats,
      peakYear: p.peakYear,
      inGovernmentNow: p.inGovernmentNow,
    })),
  });

  return (
    <ChatProvider corpus={corpus}>
      <ChatWorkspace>{children}</ChatWorkspace>
    </ChatProvider>
  );
}
