import { buildContextualQuery, detectSmallTalk, isContextualFollowUp } from '../context';
import type { ChatTurn } from '../types';

function userTurn(text: string): ChatTurn {
  return { id: text, role: 'user', text, createdAt: 0 };
}

describe('detectSmallTalk', () => {
  it('detects an introduction', () => {
    expect(detectSmallTalk('my name is Sam', [])).toEqual({ kind: 'introduced', name: 'Sam' });
  });

  it('recalls a previously given name', () => {
    const history = [userTurn('my name is Alex')];
    expect(detectSmallTalk('what is my name?', history)).toEqual({
      kind: 'tellName',
      name: 'Alex',
    });
  });

  it('handles no known name', () => {
    expect(detectSmallTalk('who am I?', [])).toEqual({ kind: 'noName' });
  });

  it('detects greetings and thanks', () => {
    expect(detectSmallTalk('hello', [])).toEqual({ kind: 'greeting' });
    expect(detectSmallTalk('thanks!', [])).toEqual({ kind: 'thanks' });
  });

  it('does not treat a real question as small talk', () => {
    expect(detectSmallTalk('who leads the Labour Party?', [])).toBeNull();
  });
});

describe('isContextualFollowUp', () => {
  it('is true for pronoun follow-ups', () => {
    expect(isContextualFollowUp('what did she vote on?', ['Chlöe Swarbrick'])).toBe(true);
  });

  it('is true when reusing a prior title token', () => {
    expect(isContextualFollowUp('more about Swarbrick', ['Chlöe Swarbrick'])).toBe(true);
  });

  it('is false for an unrelated new query', () => {
    expect(isContextualFollowUp('list the ACT MPs', ['Green Party'])).toBe(false);
  });
});

describe('buildContextualQuery', () => {
  it('appends focus titles for follow-ups', () => {
    const q = buildContextualQuery('where is her electorate?', ['Chlöe Swarbrick']);
    expect(q).toContain('Chlöe Swarbrick');
  });

  it('leaves standalone queries unchanged apart from doubling', () => {
    const q = buildContextualQuery('who leads National?', []);
    expect(q).toBe('who leads National? who leads National?');
  });
});
