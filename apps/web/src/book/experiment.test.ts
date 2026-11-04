import { beforeEach, describe, expect, it } from 'vitest';
import { book } from '../content/book.ts';
import { answerKey, bookStore } from '../state/bookStore.ts';
import { enterExperiment, experimentOfSpread } from './experiment.ts';
import { spreadOfPage } from './structure.ts';

const freeFall = spreadOfPage(book.pages, 'free-fall-text');

describe('experimentOfSpread', () => {
  it('finds the 3D experiment, its 2D figure and the prediction question on every lesson spread', () => {
    const lessons = book.pages.flatMap((page) => (page.scene ? [page.lessonId] : []));
    for (const id of lessons) {
      const experiment = experimentOfSpread(book, spreadOfPage(book.pages, `${id}-text`));
      expect(experiment?.lessonId).toBe(id);
      expect(experiment?.questionId).toBeDefined();
      expect(experiment?.page.blocks.some((block) => block.type === 'figure')).toBe(true);
    }
  });

  it('has no experiment on the cover, the contents or the summary', () => {
    expect(experimentOfSpread(book, 0)).toBeNull();
    expect(experimentOfSpread(book, spreadOfPage(book.pages, 'contents'))).toBeNull();
    expect(experimentOfSpread(book, spreadOfPage(book.pages, 'summary'))).toBeNull();
  });
});

describe('enterExperiment', () => {
  beforeEach(() => {
    bookStore.setState({
      spread: freeFall,
      settled: true,
      experiment: false,
      pendingSpread: null,
      answers: {},
      toast: null,
    });
  });

  it('asks for a prediction before the experiment opens', () => {
    expect(enterExperiment(book)).toBe(false);
    expect(bookStore.getState().experiment).toBe(false);
    expect(bookStore.getState().toast?.message).toContain('예측');
  });

  it('opens the experiment once a prediction is chosen', () => {
    bookStore.getState().choose(answerKey('free-fall', 'vacuum-drop'), 'together');
    expect(enterExperiment(book)).toBe(true);
    expect(bookStore.getState().experiment).toBe(true);
  });

  it('does nothing on a spread without an experiment', () => {
    bookStore.setState({ spread: spreadOfPage(book.pages, 'summary') });
    expect(enterExperiment(book)).toBe(false);
    expect(bookStore.getState().toast).toBeNull();
  });
});
