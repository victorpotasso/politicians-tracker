import { LexicalRetriever } from '../retriever';
import type { ChatDoc } from '../types';

function person(id: string, title: string, text: string): ChatDoc {
  return {
    id: `person:${id}`,
    group: 'person',
    title,
    subtitle: '',
    lead: text.slice(0, 80),
    href: `/politicians/${id}`,
    text,
  };
}

const CORPUS: ChatDoc[] = [
  person('luxon', 'Christopher Luxon', 'Christopher Luxon National Party leader Prime Minister'),
  person('hipkins', 'Chris Hipkins', 'Chris Hipkins Labour Party leader former Prime Minister'),
  person('swarbrick', 'Chlöe Swarbrick', 'Chlöe Swarbrick Green Party co-leader Auckland Central'),
  {
    id: 'party:green',
    group: 'party',
    title: 'Green Party',
    subtitle: '',
    lead: 'The Green Party of Aotearoa New Zealand',
    href: '/parties/green',
    text: 'Green Party environmental progressive New Zealand Parliament',
  },
];

describe('LexicalRetriever', () => {
  const retriever = new LexicalRetriever(CORPUS);

  it('ranks the named person top for a name query', () => {
    const hits = retriever.search('Christopher Luxon');
    expect(hits[0]?.doc.id).toBe('person:luxon');
  });

  it('handles diacritics in names', () => {
    const hits = retriever.search('Chloe Swarbrick');
    expect(hits[0]?.doc.id).toBe('person:swarbrick');
  });

  it('tolerates a small typo', () => {
    const hits = retriever.search('Hipkin');
    expect(hits[0]?.doc.id).toBe('person:hipkins');
  });

  it('finds a party by name', () => {
    const hits = retriever.search('Green Party');
    expect(hits[0]?.doc.group).toBe('party');
  });

  it('returns nothing for an empty query', () => {
    expect(retriever.search('')).toEqual([]);
  });
});
