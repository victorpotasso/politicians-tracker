import type { ChatTurn } from './types';

/** Result of intercepting a message before retrieval. */
export type SmallTalk =
  | { kind: 'introduced'; name: string }
  | { kind: 'tellName'; name: string }
  | { kind: 'noName' }
  | { kind: 'greeting' }
  | { kind: 'thanks' }
  | null;

const INTRO_RE = /\b(?:my name is|i am|i'm|call me)\s+([a-z][a-z'-]+)\b/i;
const NAME_RECALL_RE = /\b(?:what(?:'s| is) my name|who am i|do you know my name)\b/i;
const GREETING_RE = /^\s*(?:hi|hey|hello|kia ora|yo|good (?:morning|afternoon|evening))\b/i;
const THANKS_RE = /\b(?:thanks|thank you|cheers|ta|much appreciated)\b/i;

function priorName(history: ChatTurn[]): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn.role !== 'user') continue;
    const match = turn.text.match(INTRO_RE);
    if (match) return match[1];
  }
  return null;
}

/** Intercept greetings / introductions / thanks before hitting the retriever. */
export function detectSmallTalk(text: string, history: ChatTurn[]): SmallTalk {
  const intro = text.match(INTRO_RE);
  if (intro && !/\b(?:looking for|interested|not sure|confused)\b/i.test(text)) {
    return { kind: 'introduced', name: intro[1] };
  }
  if (NAME_RECALL_RE.test(text)) {
    const name = priorName(history);
    return name ? { kind: 'tellName', name } : { kind: 'noName' };
  }
  if (THANKS_RE.test(text) && tokenCount(text) <= 6) return { kind: 'thanks' };
  if (GREETING_RE.test(text) && tokenCount(text) <= 6) return { kind: 'greeting' };
  return null;
}

function tokenCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const PRONOUNS = /\b(?:he|she|they|him|her|them|his|hers|their|it|that|this|these|those)\b/i;
const RELATIONAL =
  /\b(?:party|electorate|seat|vote|voted|expenses|spend|spent|role|minister|leader|born|elected|polling|poll)\b/i;

/**
 * A follow-up reuses context from the previous turn — a pronoun, a relational
 * word, or a token from the last cited titles. This is what makes "what did she
 * vote on?" resolve to the person from the previous answer.
 */
export function isContextualFollowUp(text: string, lastEntityTitles: string[]): boolean {
  if (PRONOUNS.test(text)) return true;
  if (RELATIONAL.test(text) && tokenCount(text) <= 8) return true;
  const lower = text.toLowerCase();
  for (const title of lastEntityTitles) {
    for (const part of title.toLowerCase().split(/\s+/)) {
      if (part.length > 2 && lower.includes(part)) return true;
    }
  }
  return false;
}

/** Append previous cited titles to a follow-up query to disambiguate it. */
export function buildContextualQuery(text: string, lastEntityTitles: string[]): string {
  const base = `${text} ${text}`;
  if (!isContextualFollowUp(text, lastEntityTitles)) return base;
  const focus = lastEntityTitles.slice(0, 2).join(' ');
  if (!focus) return base;
  return `${base} ${focus} ${focus}`;
}

export interface SmallTalkReply {
  text: string;
}

/** Render a small-talk turn from templates — no retrieval, no model. */
export function smallTalkReply(result: NonNullable<SmallTalk>): string {
  switch (result.kind) {
    case 'introduced':
      return `Nice to meet you, ${result.name}! Ask me anything about New Zealand's MPs, parties, bills or polls.`;
    case 'tellName':
      return `You told me your name is ${result.name}.`;
    case 'noName':
      return "You haven't told me your name yet — what should I call you?";
    case 'thanks':
      return 'Anytime! Ask me anything else about the tracker.';
    case 'greeting':
      return "Kia ora! Ask me about any MP, party, bill or recent poll and I'll pull the records.";
  }
}
