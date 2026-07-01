import { type Candidate, resolveAnswerSources } from '../cite';
import type { ChatDoc } from '../types';

function person(id: string, title: string): ChatDoc {
  return {
    id: `person:${id}`,
    group: 'person',
    title,
    subtitle: '',
    lead: title,
    href: `/politicians/${id}`,
    text: title,
  };
}

const LUXON = person('luxon', 'Christopher Luxon');
const HIPKINS = person('hipkins', 'Chris Hipkins');

const CANDIDATES: Candidate[] = [
  { doc: LUXON, score: 3 },
  { doc: HIPKINS, score: 2 },
];

describe('resolveAnswerSources', () => {
  it('keeps and renumbers valid [n] markers', () => {
    const { text, sources } = resolveAnswerSources('Luxon leads National [1].', CANDIDATES);
    expect(sources).toEqual([LUXON]);
    expect(text).toContain('[1]');
  });

  it('drops invalid [n] markers and cites named entities instead', () => {
    const { sources } = resolveAnswerSources('Christopher Luxon is the leader [9].', CANDIDATES);
    expect(sources.map((s) => s.id)).toContain('person:luxon');
  });

  it('cites people named without any markers', () => {
    const { sources } = resolveAnswerSources('Chris Hipkins leads Labour.', CANDIDATES);
    expect(sources.map((s) => s.id)).toEqual(['person:hipkins']);
  });

  it('does not cite anyone when only a generic word appears', () => {
    const { sources } = resolveAnswerSources('The party has many members.', CANDIDATES);
    expect(sources).toEqual([]);
  });

  it('renumbers a second cited record contiguously', () => {
    const { text, sources } = resolveAnswerSources('Hipkins [2] opposed the bill.', CANDIDATES);
    expect(sources).toEqual([HIPKINS]);
    expect(text).toContain('[1]');
  });
});
