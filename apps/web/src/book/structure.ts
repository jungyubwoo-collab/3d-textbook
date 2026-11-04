import type { BookDefinition, PageSpec } from './types.ts';

/** 종이 한 장. 앞면은 오른쪽 페이지로, 뒷면은 넘긴 뒤 왼쪽 페이지로 보인다. */
export interface Leaf {
  index: number;
  front: PageSpec;
  back: PageSpec;
  cover: boolean;
}

export function toLeaves(pages: PageSpec[]): Leaf[] {
  if (pages.length < 2 || pages.length % 2 !== 0) {
    throw new Error(`페이지 수는 2 이상의 짝수여야 합니다 (현재 ${pages.length}).`);
  }
  const leaves: Leaf[] = [];
  for (let i = 0; i < pages.length; i += 2) {
    leaves.push({
      index: i / 2,
      front: pages[i]!,
      back: pages[i + 1]!,
      cover: i === 0 || i === pages.length - 2,
    });
  }
  return leaves;
}

/** 펼침면 수. 0 = 앞표지만 보이는 닫힌 책, 마지막 = 뒤표지만 보이는 닫힌 책 */
export function spreadCount(pages: PageSpec[]): number {
  return pages.length / 2 + 1;
}

/** 펼침면 s 에서 보이는 왼쪽·오른쪽 페이지 */
export function pagesOfSpread(
  pages: PageSpec[],
  spread: number,
): { left: PageSpec | undefined; right: PageSpec | undefined } {
  return {
    left: spread > 0 ? pages[2 * spread - 1] : undefined,
    right: 2 * spread < pages.length ? pages[2 * spread] : undefined,
  };
}

/** 펼침면 s 에서 흐를 배경음악. 오른쪽 페이지 → 왼쪽 페이지 → 책의 기본 곡 순서로 찾는다. */
export function musicOfSpread(book: BookDefinition, spread: number): string | undefined {
  const { left, right } = pagesOfSpread(book.pages, spread);
  return right?.music ?? left?.music ?? book.music;
}

export function spreadOfPage(pages: PageSpec[], pageId: string): number {
  const index = pages.findIndex((page) => page.id === pageId);
  if (index < 0) throw new Error(`페이지 "${pageId}"가 없습니다.`);
  return Math.ceil(index / 2);
}

function isCoverStyle(page: PageSpec): boolean {
  return page.style === 'cover-front' || page.style === 'cover-back';
}

/** 인쇄되는 쪽 번호. 앞표지 다음 장의 오른쪽 페이지가 1쪽(홀수 = 오른쪽)이다. */
export function pageNumber(pages: PageSpec[], pageId: string): number | undefined {
  const index = pages.findIndex((page) => page.id === pageId);
  const page = pages[index];
  if (!page) return undefined;
  const show = page.showNumber ?? !isCoverStyle(page);
  return show ? index - 1 : undefined;
}

/** 툴바에 보여 줄 위치 이름 */
export function spreadLabel(pages: PageSpec[], spread: number): string {
  if (spread <= 0) return '표지';
  if (spread >= spreadCount(pages) - 1) return '뒤표지';
  const { left, right } = pagesOfSpread(pages, spread);
  const numbers = [left, right]
    .map((page) => (page ? pageNumber(pages, page.id) : undefined))
    .filter((n): n is number => n !== undefined);
  if (numbers.length === 0) return '속표지';
  return numbers.length === 2 ? `${numbers[0]}–${numbers[1]}쪽` : `${numbers[0]}쪽`;
}

/** 책 정의의 실수를 찾아 문장으로 돌려준다. 빈 배열이면 문제가 없다. */
export function validateBook(pages: PageSpec[]): string[] {
  const problems: string[] = [];
  if (pages.length < 2 || pages.length % 2 !== 0) problems.push('페이지 수는 짝수여야 합니다.');
  if (pages[0]?.style !== 'cover-front')
    problems.push('첫 페이지는 앞표지(cover-front)여야 합니다.');
  if (pages.at(-1)?.style !== 'cover-back')
    problems.push('마지막 페이지는 뒤표지(cover-back)여야 합니다.');

  const ids = new Set<string>();
  const questionKeys = new Set<string>();
  pages.forEach((page, index) => {
    if (ids.has(page.id)) problems.push(`페이지 ID "${page.id}"가 중복됩니다.`);
    ids.add(page.id);

    if (page.scene && index % 2 !== 0) {
      problems.push(`"${page.id}": 3D 장면은 오른쪽(짝수 번째) 페이지에만 둘 수 있습니다.`);
    }
    for (const block of page.blocks) {
      if (block.type !== 'question') continue;
      const { question } = block;
      if (!page.lessonId)
        problems.push(`"${page.id}": 문항이 있는 페이지에는 lessonId가 필요합니다.`);
      const key = `${page.lessonId}/${question.id}`;
      if (questionKeys.has(key)) problems.push(`문항 "${key}"가 중복됩니다.`);
      questionKeys.add(key);
      if (!question.choices.some((choice) => choice.id === question.answerId)) {
        problems.push(`문항 "${key}"의 정답 "${question.answerId}"가 보기에 없습니다.`);
      }
    }
  });

  for (const page of pages) {
    for (const block of page.blocks) {
      if (block.type !== 'toc') continue;
      for (const entry of block.entries) {
        if (!ids.has(entry.pageId))
          problems.push(`차례의 "${entry.title}"가 없는 페이지를 가리킵니다.`);
      }
    }
  }
  return problems;
}
