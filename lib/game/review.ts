import { addDays } from "./dates";

// Spaced review (Leitner boxes): a question you miss comes back tomorrow; each correct review pushes it further away.
export const INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;
export type ReviewItem = { box: number; due: string };
export type ReviewDeck = Record<string, ReviewItem>; // key: "w2/if-statement#q3"

export const reviewKey = (topicKey: string, qid: string) => `${topicKey}#${qid}`;
export const topicOfReviewKey = (k: string) => k.split("#")[0];

/** A missed question (anywhere) enters box 0 and is due tomorrow. A question already in the deck is reset to box 0. */
export function scheduleMiss(deck: ReviewDeck, key: string, today: string): ReviewDeck {
  return { ...deck, [key]: { box: 0, due: addDays(today, INTERVALS_DAYS[0]) } };
}

/** Result of a review attempt. Correct: next box (after the last box the card graduates and leaves the deck). Wrong: back to box 0. */
export function applyReview(deck: ReviewDeck, key: string, correct: boolean, today: string): ReviewDeck {
  const item = deck[key];
  if (!item) return deck;
  if (!correct) return { ...deck, [key]: { box: 0, due: addDays(today, INTERVALS_DAYS[0]) } };
  const box = item.box + 1;
  if (box >= INTERVALS_DAYS.length) {
    const rest = { ...deck };
    delete rest[key];
    return rest;
  }
  return { ...deck, [key]: { box, due: addDays(today, INTERVALS_DAYS[box]) } };
}

export const dueKeys = (deck: ReviewDeck, today: string): string[] =>
  Object.entries(deck).filter(([, v]) => v.due <= today).sort((a, b) => a[1].due.localeCompare(b[1].due) || a[0].localeCompare(b[0])).map(([k]) => k);
