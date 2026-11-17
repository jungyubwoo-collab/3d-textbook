import { beforeEach, describe, expect, it } from 'vitest';
import { bookStore } from './bookStore.ts';

describe('3D experiment mode', () => {
  beforeEach(() => {
    bookStore.setState({
      spread: 2,
      spreadCount: 10,
      settled: true,
      experiment: false,
      pendingSpread: null,
    });
  });

  it('opens the experiment only while the pages rest', () => {
    bookStore.setState({ settled: false });
    bookStore.getState().startExperiment();
    expect(bookStore.getState().experiment).toBe(false);
    bookStore.setState({ settled: true });
    bookStore.getState().startExperiment();
    expect(bookStore.getState().experiment).toBe(true);
  });

  it('folds back to the document first and turns the page once the scene has folded', () => {
    const store = bookStore.getState();
    store.startExperiment();
    store.next();
    expect(bookStore.getState()).toMatchObject({ spread: 2, experiment: false, pendingSpread: 3 });
    // 접는 동안 한 번 더 누르면 갈 곳만 바뀐다.
    bookStore.getState().next();
    expect(bookStore.getState()).toMatchObject({ spread: 2, pendingSpread: 3 });
    bookStore.getState().goTo(5);
    expect(bookStore.getState().pendingSpread).toBe(5);
    bookStore.getState().flushPending();
    expect(bookStore.getState()).toMatchObject({ spread: 5, pendingSpread: null, settled: false });
  });

  it('turns pages right away in document mode', () => {
    bookStore.getState().next();
    expect(bookStore.getState()).toMatchObject({ spread: 3, pendingSpread: null });
  });

  it('cancels a pending turn when asked to stay on the same spread', () => {
    const store = bookStore.getState();
    store.startExperiment();
    store.goTo(2);
    expect(bookStore.getState()).toMatchObject({ experiment: false, pendingSpread: null });
  });
});

describe('missions', () => {
  it('keeps the mission board a scene reports and drops it when the scene goes away', () => {
    const board = { items: [{ label: '한 번 기록하기', done: true }], conclusion: 'a = F ÷ m' };
    bookStore.getState().setMissions('newton-laws', board);
    bookStore.getState().setMissions('pulley', { items: [], conclusion: '' });
    expect(bookStore.getState().missions['newton-laws']).toEqual(board);
    bookStore.getState().setMissions('newton-laws', null);
    expect(Object.keys(bookStore.getState().missions)).toEqual(['pulley']);
    bookStore.getState().setMissions('pulley', null);
  });
});
