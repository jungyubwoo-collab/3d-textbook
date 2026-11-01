import { describe, expect, it } from 'vitest';
import {
  pageNumber,
  pagesOfSpread,
  spreadCount,
  spreadLabel,
  spreadOfPage,
  toLeaves,
  validateBook,
} from '../book/structure.ts';
import type { PageSpec } from '../book/types.ts';
import { book } from './book.ts';

describe('the sample book', () => {
  it('has no structural problems', () => {
    expect(validateBook(book.pages)).toEqual([]);
  });

  it('opens the lever lesson as one spread: text on the left, 3D scene on the right', () => {
    const spread = spreadOfPage(book.pages, 'lever-text');
    const { left, right } = pagesOfSpread(book.pages, spread);
    expect(left?.id).toBe('lever-text');
    expect(right?.id).toBe('lever-scene');
    expect(right?.scene).toBeDefined();
  });
});

function page(id: string, extra: Partial<PageSpec> = {}): PageSpec {
  return { id, blocks: [], ...extra };
}

describe('book structure', () => {
  const pages = [
    page('front', { style: 'cover-front' }),
    page('inside'),
    page('p1'),
    page('p2'),
    page('p3'),
    page('back', { style: 'cover-back' }),
  ];

  it('pairs pages into leaves and marks covers', () => {
    const leaves = toLeaves(pages);
    expect(leaves.map((leaf) => [leaf.front.id, leaf.back.id, leaf.cover])).toEqual([
      ['front', 'inside', true],
      ['p1', 'p2', false],
      ['p3', 'back', true],
    ]);
    expect(() => toLeaves(pages.slice(0, 5))).toThrow('짝수');
  });

  it('maps spreads to visible pages', () => {
    expect(spreadCount(pages)).toBe(4);
    expect(pagesOfSpread(pages, 0)).toEqual({ left: undefined, right: pages[0] });
    expect(pagesOfSpread(pages, 1)).toEqual({ left: pages[1], right: pages[2] });
    expect(pagesOfSpread(pages, 3)).toEqual({ left: pages[5], right: undefined });
    expect(spreadOfPage(pages, 'p2')).toBe(2);
    expect(spreadOfPage(pages, 'p3')).toBe(2);
  });

  it('numbers pages with odd numbers on the right', () => {
    expect(pageNumber(pages, 'front')).toBeUndefined();
    expect(pageNumber(pages, 'p1')).toBe(1);
    expect(pageNumber(pages, 'p2')).toBe(2);
    expect(spreadLabel(pages, 0)).toBe('표지');
    expect(spreadLabel(pages, 2)).toBe('2–3쪽');
    expect(spreadLabel(pages, 3)).toBe('뒤표지');
  });

  it('reports scenes on left pages and broken links', () => {
    const broken = [
      page('front', { style: 'cover-front' }),
      page('left', { scene: () => null }),
      page('toc', { blocks: [{ type: 'toc', entries: [{ title: 'x', pageId: 'missing' }] }] }),
      page('back', { style: 'cover-back' }),
    ];
    expect(validateBook(broken)).toEqual([
      '"left": 3D 장면은 오른쪽(짝수 번째) 페이지에만 둘 수 있습니다.',
      '차례의 "x"가 없는 페이지를 가리킵니다.',
    ]);
  });
});
