import { describe, expect, it } from 'vitest';
import { layoutPage, wrapText, type Measure, type Region } from './typeset.ts';
import type { PageSpec } from './types.ts';

/** 그림 칸 시험용: 아무것도 그리지 않는 그림 */
const drawNothing = () => {};

/** 글꼴 크기만큼 글자마다 폭을 주는 가짜 측정 함수 */
const measure: Measure = (text, font) => {
  const size = Number(/(\d+)px/.exec(font)?.[1] ?? 10);
  return Array.from(text).length * size;
};

describe('wrapText', () => {
  it('breaks lines at spaces', () => {
    expect(wrapText('가나 다라 마바', 50, '10px x', measure)).toEqual(['가나 다라', '마바']);
  });

  it('breaks a word longer than the line by characters', () => {
    expect(wrapText('가나다라마바사', 30, '10px x', measure)).toEqual(['가나다', '라마바', '사']);
  });

  it('keeps explicit line breaks', () => {
    expect(wrapText('가\n나', 100, '10px x', measure)).toEqual(['가', '나']);
  });
});

describe('layoutPage', () => {
  const options = { width: 1024, height: 1393, side: 'left' as const, measure, fontFamily: 'Test' };

  const questionPage: PageSpec = {
    id: 'q',
    lessonId: 'lesson',
    blocks: [
      {
        type: 'question',
        question: {
          id: 'q1',
          prompt: '몇 개일까요?',
          choices: [
            { id: 'a', label: '1개' },
            { id: 'b', label: '2개' },
          ],
          answerId: 'b',
          explanation: '설명',
        },
      },
    ],
  };

  it('creates a choice region per choice, an answer flap and a stamp spot', () => {
    const { regions } = layoutPage(questionPage, options);
    const kinds = regions.map((region) => region.kind);
    expect(kinds).toEqual(['choice', 'choice', 'answer', 'stamp']);
    const choices = regions.filter(
      (region): region is Extract<Region, { kind: 'choice' }> => region.kind === 'choice',
    );
    expect(choices.map((choice) => [choice.choiceId, choice.isAnswer])).toEqual([
      ['a', false],
      ['b', true],
    ]);
  });

  it('keeps the answer text out of the printed page until the flap is opened', () => {
    const { items, regions } = layoutPage(questionPage, options);
    const answer = regions.find((region) => region.kind === 'answer');
    const printed = items.flatMap((item) => (item.kind === 'text' ? [item.text] : []));
    expect(printed.some((text) => text.startsWith('정답') || text.includes('설명'))).toBe(false);
    expect(
      answer?.kind === 'answer' &&
        answer.items.some((item) => item.kind === 'text' && item.text.includes('2개')),
    ).toBe(true);
  });

  it('uses the wider margin on the spine side', () => {
    const left = layoutPage({ id: 'p', blocks: [{ type: 'heading', text: '가' }] }, options);
    const right = layoutPage(
      { id: 'p', blocks: [{ type: 'heading', text: '가' }] },
      { ...options, side: 'right' },
    );
    const x = (layout: typeof left) => (layout.items[0]?.kind === 'text' ? layout.items[0].x : -1);
    expect(x(left)).toBeLessThan(x(right));
  });

  it('links table of contents rows to pages', () => {
    const { regions } = layoutPage(
      {
        id: 'toc',
        blocks: [{ type: 'toc', entries: [{ title: '1. 지레', pageId: 'lever-text' }] }],
      },
      { ...options, pageNumberOf: () => 2 },
    );
    expect(regions).toEqual([expect.objectContaining({ kind: 'link', pageId: 'lever-text' })]);
  });

  it('lays out a formula table with one rule under each row', () => {
    const { items } = layoutPage(
      {
        id: 'summary',
        blocks: [
          {
            type: 'table',
            rows: [
              ['위치 에너지', 'Ep = m g h'],
              ['운동량', 'p = m v'],
            ],
          },
        ],
      },
      options,
    );
    const texts = items.flatMap((item) => (item.kind === 'text' ? [item.text] : []));
    expect(texts).toEqual(['위치 에너지', 'Ep = m g h', '운동량', 'p = m v']);
    expect(items.filter((item) => item.kind === 'line')).toHaveLength(2);
  });

  it('fills the space above the bottom caption with a blueprint grid', () => {
    const { items, overflow } = layoutPage(
      {
        id: 'scene',
        blocks: [
          { type: 'subheading', text: '실험' },
          { type: 'grid' },
          { type: 'caption', text: '그림', placement: 'bottom' },
        ],
      },
      options,
    );
    const lines = items.filter((item) => item.kind === 'line');
    expect(lines.length).toBeGreaterThan(40);
    expect(overflow).toBe(false);
  });

  it('reserves a figure area that the drawing fills and the experiment opens from', () => {
    const { items, regions, overflow } = layoutPage(
      {
        id: 'scene',
        blocks: [
          { type: 'subheading', text: '실험' },
          { type: 'figure', draw: drawNothing, text: '', alt: '그림 설명' },
          { type: 'caption', text: '그림', placement: 'bottom' },
        ],
      },
      { ...options, side: 'right' },
    );
    const figure = items.find((item) => item.kind === 'figure');
    expect(figure?.kind === 'figure' ? figure.draw : undefined).toBe(drawNothing);
    expect(regions).toEqual([expect.objectContaining({ kind: 'figure' })]);
    expect(overflow).toBe(false);
  });

  it('flags pages whose content runs past the bottom margin', () => {
    const long: PageSpec = { id: 'long', blocks: [{ type: 'lines', count: 40 }] };
    expect(layoutPage(long, options).overflow).toBe(true);
    expect(
      layoutPage({ id: 'short', blocks: [{ type: 'lines', count: 3 }] }, options).overflow,
    ).toBe(false);
  });
});
