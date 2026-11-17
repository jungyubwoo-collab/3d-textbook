import { beforeEach, describe, expect, it } from 'vitest';
import { book } from '../content/book.ts';
import { answerKey, bookStore } from '../state/bookStore.ts';
import { enterExperiment, experimentOfSpread } from './experiment.ts';
import { spreadOfPage } from './structure.ts';

const freeFall = spreadOfPage(book.pages, 'free-fall-text');

/** 부록의 실험실은 예측 문항 없이 바로 둘러본다. */
const isLab = (id: string) => id.startsWith('lab-');

describe('experimentOfSpread', () => {
  const sceneLessons = book.pages.flatMap((page) =>
    page.scene && page.lessonId ? [page.lessonId] : [],
  );
  it('finds the 3D experiment and its 2D figure on every lesson spread', () => {
    for (const id of sceneLessons) {
      const experiment = experimentOfSpread(book, spreadOfPage(book.pages, `${id}-text`));
      expect(experiment?.lessonId).toBe(id);
      expect(experiment?.page.blocks.some((block) => block.type === 'figure')).toBe(true);
    }
  });

  it('asks a prediction before every experiment, and names the button "3D로 실험하기"', () => {
    for (const id of sceneLessons.filter((lesson) => !isLab(lesson))) {
      const experiment = experimentOfSpread(book, spreadOfPage(book.pages, `${id}-text`));
      expect(experiment?.questionId).toBeDefined();
      expect(experiment?.label).toBe('3D로 실험하기');
    }
  });

  it('lets the labs open without a prediction, with the button "3D로 둘러보기"', () => {
    const labs = sceneLessons.filter(isLab);
    expect(labs).toEqual(['lab-physics', 'lab-chemistry']);
    for (const id of labs) {
      const experiment = experimentOfSpread(book, spreadOfPage(book.pages, `${id}-text`));
      expect(experiment?.questionId).toBeUndefined();
      expect(experiment?.label).toBe('3D로 둘러보기');
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

  it('opens a lab right away: there is no prediction to make', () => {
    bookStore.setState({ spread: spreadOfPage(book.pages, 'lab-physics-text') });
    expect(enterExperiment(book)).toBe(true);
    expect(bookStore.getState().experiment).toBe(true);
  });

  it('does nothing on a spread without an experiment', () => {
    bookStore.setState({ spread: spreadOfPage(book.pages, 'summary') });
    expect(enterExperiment(book)).toBe(false);
    expect(bookStore.getState().toast).toBeNull();
  });
});
