import type { Domain } from '../../src/types/records';
import { writeDataset } from '../lib/io';
import { billsCollector } from './bills';
import { expensesCollector } from './expenses';
import { ministersCollector } from './ministers';
import { mpsCollector } from './mps';
import { pollsCollector } from './polls';
import { spendingCollector } from './spending';
import type { Collector } from './types';
import { votesCollector } from './votes';

const COLLECTORS: Record<Domain, Collector> = {
  mps: mpsCollector,
  bills: billsCollector,
  votes: votesCollector,
  expenses: expensesCollector,
  ministers: ministersCollector,
  polls: pollsCollector,
  spending: spendingCollector,
};

const ALL_DOMAINS = Object.keys(COLLECTORS) as Domain[];

function parseArgs(argv: string[]): { domains: Domain[]; force: boolean } {
  const args = argv.slice(2);
  const force = args.includes('--force');
  const positional = args.filter((a) => !a.startsWith('--'));
  const requested = positional[0] ?? 'all';

  if (requested === 'all') return { domains: ALL_DOMAINS, force };
  if (!(requested in COLLECTORS)) {
    console.error(`Unknown domain "${requested}". Valid: all, ${ALL_DOMAINS.join(', ')}`);
    process.exit(1);
  }
  return { domains: [requested as Domain], force };
}

async function main(): Promise<void> {
  const { domains, force } = parseArgs(process.argv);
  console.log(`Collecting: ${domains.join(', ')}${force ? ' (force refresh)' : ''}\n`);

  let failures = 0;
  for (const domain of domains) {
    const collector = COLLECTORS[domain];
    process.stdout.write(`• ${domain} — ${collector.describe}\n`);
    try {
      const { records, sources } = await collector.run({ force });
      const path = await writeDataset(domain, records, sources);
      console.log(`  ✓ ${records.length} records → ${path.replace(process.cwd(), '.')}\n`);
    } catch (error) {
      failures += 1;
      console.error(`  ✗ ${domain} failed: ${(error as Error).message}\n`);
    }
  }

  if (failures > 0) {
    console.error(`Done with ${failures} failure(s).`);
    process.exit(1);
  }
  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
