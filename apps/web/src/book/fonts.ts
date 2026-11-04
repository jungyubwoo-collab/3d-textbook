import type { PageBlock, PageSpec } from './types.ts';

/** 페이지 텍스처에 쓰는 글꼴. Pretendard(OFL)를 번들해 기기마다 같은 모양으로 그린다. */
export const FONT_FAMILY =
  '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

function blockText(block: PageBlock): string {
  switch (block.type) {
    case 'eyebrow':
    case 'heading':
    case 'subheading':
    case 'paragraph':
    case 'caption':
      return block.text;
    case 'formula':
      return `${block.text} ${block.note ?? ''}`;
    case 'list':
      return block.items.join(' ');
    case 'toc':
      return block.entries.map((entry) => entry.title).join(' ');
    case 'question': {
      const { question } = block;
      return [
        question.prompt,
        question.explanation,
        ...question.choices.map((choice) => choice.label),
      ].join(' ');
    }
    case 'table':
      return block.rows.flat().join(' ');
    case 'figure':
      return `${block.text} ${block.alt}`;
    case 'lines':
    case 'grid':
    case 'spacer':
      return '';
  }
}

/** 페이지 글자를 모두 모은다(글꼴 부분 파일을 미리 받기 위해). */
export function collectText(pages: PageSpec[]): string {
  const fixed =
    '0123456789①②③④⑤–예측해 보세요정답과 해설덮개를 눌러 들춰 확인하세요참 잘했어요수평!쪽3D로 실험하기';
  return fixed + pages.flatMap((page) => page.blocks.map(blockText)).join(' ');
}

/**
 * canvas에 글자를 그리기 전에 글꼴을 받아 둔다.
 * Pretendard는 글자 범위별로 파일이 나뉘어 있어, 쓰는 글자를 넘겨야 필요한 파일만 받는다.
 */
export async function loadFonts(text: string): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const unique = Array.from(new Set(Array.from(text))).join('');
  try {
    await Promise.all(
      [400, 800].map((weight) =>
        document.fonts.load(`${weight} 32px "Pretendard Variable"`, unique),
      ),
    );
  } catch {
    // 글꼴을 못 받아도 대체 글꼴로 그린다.
  }
}

let measureContext: CanvasRenderingContext2D | null = null;

/** canvas 기반 글자 폭 측정 */
export function measureText(text: string, font: string): number {
  measureContext ??= document.createElement('canvas').getContext('2d');
  if (!measureContext) return text.length * 16;
  measureContext.font = font;
  return measureContext.measureText(text).width;
}
