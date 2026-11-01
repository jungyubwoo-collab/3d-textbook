import { beforeEach, describe, expect, it } from 'vitest';
import { answerKey, bookStore } from './bookStore.ts';

const key = answerKey('lever', 'balance');
const store = () => bookStore.getState();

beforeEach(() => {
  bookStore.setState({
    spread: 0,
    spreadCount: 5,
    settled: true,
    restingSpread: 0,
    answers: {},
    toast: null,
  });
});

describe('navigation', () => {
  it('moves between spreads within bounds', () => {
    store().prev();
    expect(store().spread).toBe(0);
    store().next();
    expect(store().spread).toBe(1);
    store().goTo(99);
    expect(store().spread).toBe(4);
  });

  it('marks the book as turning until the animation reports it settled', () => {
    store().next();
    expect(store().settled).toBe(false);
    expect(store().restingSpread).toBe(0);
    store().setSettled(true);
    expect(store().settled).toBe(true);
    expect(store().restingSpread).toBe(1);
  });

  it('does not unsettle when going to the current spread', () => {
    store().goTo(0);
    expect(store().settled).toBe(true);
  });
});

describe('predictions', () => {
  it('cannot reveal before choosing', () => {
    expect(store().reveal(key, true)).toBe(false);
    expect(store().answers[key]).toBeUndefined();
  });

  it('allows changing the choice until revealed, then locks it', () => {
    store().choose(key, 'two');
    store().choose(key, 'one');
    expect(store().reveal(key, true)).toBe(true);
    store().choose(key, 'four');
    expect(store().answers[key]).toMatchObject({ choiceId: 'one', revealed: true, correct: true });
  });

  it('plays the stamp only for correct answers', () => {
    store().choose(key, 'one');
    store().reveal(key, true);
    expect(store().answers[key]?.stampPending).toBe(true);
    store().settleStamp(key);
    expect(store().answers[key]?.stampPending).toBe(false);

    const other = answerKey('lever', 'other');
    store().choose(other, 'two');
    store().reveal(other, false);
    expect(store().answers[other]?.stampPending).toBe(false);
  });
});

it('replaces toasts and dismisses only the current one', () => {
  store().showToast('first');
  const first = store().toast!;
  store().showToast('second');
  store().dismissToast(first.id);
  expect(store().toast?.message).toBe('second');
});
