import { COLORS } from './constants.ts';
import type { FigureDraw, PageBlock, PageSpec, Question } from './types.ts';

/** 글자 폭 측정 함수. 실제로는 canvas의 measureText, 테스트에서는 가짜 함수를 넣는다. */
export type Measure = (text: string, font: string) => number;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type DrawItem =
  | {
      kind: 'text';
      x: number;
      /** 줄의 세로 중앙 */
      y: number;
      text: string;
      font: string;
      color: string;
      align?: 'left' | 'center' | 'right';
    }
  | {
      kind: 'box';
      rect: Rect;
      fill?: string;
      stroke?: string;
      lineWidth?: number;
      radius?: number;
      dash?: number[];
    }
  | {
      kind: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: string;
      lineWidth: number;
      dash?: number[];
    }
  | { kind: 'figure'; rect: Rect; draw: FigureDraw };

/** 페이지 위에서 상호작용하거나 상태에 따라 다르게 그려지는 영역 */
export type Region =
  | {
      kind: 'choice';
      questionId: string;
      choiceId: string;
      isAnswer: boolean;
      /** 누를 수 있는 줄 전체 */
      rect: Rect;
      /** 체크 상자 */
      box: Rect;
      /** 보기 글자 부분 (채점 표시용) */
      label: Rect;
    }
  | {
      kind: 'answer';
      questionId: string;
      /** 덮개가 덮는 영역 */
      rect: Rect;
      /** 덮개를 연 뒤에만 그리는 정답·해설 */
      items: DrawItem[];
    }
  | { kind: 'stamp'; questionId: string; x: number; y: number; radius: number }
  | { kind: 'link'; pageId: string; rect: Rect }
  /** 2D 그림 칸. 누르면 3D 실험으로 펼친다. */
  | { kind: 'figure'; rect: Rect };

export interface PageLayout {
  items: DrawItem[];
  regions: Region[];
  /** 내용이 아래 여백을 넘었는지 */
  overflow: boolean;
}

export interface LayoutOptions {
  width: number;
  height: number;
  /** 책을 펼쳤을 때 이 페이지가 놓이는 쪽. 안쪽(책등 쪽) 여백이 더 넓다. */
  side: 'left' | 'right';
  measure: Measure;
  fontFamily: string;
  pageNumber?: number | undefined;
  /** 차례에 쓸 쪽 번호 */
  pageNumberOf?: (pageId: string) => number | undefined;
}

export const MARGIN = { top: 100, bottom: 112, outer: 92, inner: 110 } as const;
const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

/** 띄어쓰기 단위로 줄을 바꾸고, 한 단어가 한 줄보다 길면 글자 단위로 자른다. */
export function wrapText(text: string, maxWidth: number, font: string, measure: Measure): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate, font) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (measure(word, font) <= maxWidth) {
        line = word;
        continue;
      }
      let chunk = '';
      for (const char of Array.from(word)) {
        if (chunk && measure(chunk + char, font) > maxWidth) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      line = chunk;
    }
    lines.push(line);
  }
  return lines;
}

export function layoutPage(page: PageSpec, options: LayoutOptions): PageLayout {
  const style = page.style ?? 'paper';
  const cover = style === 'cover-front' || style === 'cover-back';
  return cover ? layoutCover(page, options) : layoutPaper(page, options);
}

function fontOf(family: string, weight: number, size: number): string {
  return `${weight} ${size}px ${family}`;
}

function layoutPaper(page: PageSpec, options: LayoutOptions): PageLayout {
  const { width, height, side, measure, fontFamily } = options;
  const left = side === 'left' ? MARGIN.outer : MARGIN.inner;
  const right = width - (side === 'left' ? MARGIN.inner : MARGIN.outer);
  const contentWidth = right - left;
  const bottomLimit = height - MARGIN.bottom;
  const font = (weight: number, size: number) => fontOf(fontFamily, weight, size);

  const items: DrawItem[] = [];
  const regions: Region[] = [];
  let y = MARGIN.top;

  const text = (
    value: string,
    x: number,
    centerY: number,
    f: string,
    color: string,
    align?: 'left' | 'center' | 'right',
  ) => {
    items.push(
      align
        ? { kind: 'text', x, y: centerY, text: value, font: f, color, align }
        : { kind: 'text', x, y: centerY, text: value, font: f, color },
    );
  };

  /** 문단을 줄바꿈해서 배치하고 y를 내린다. */
  const flow = (
    value: string,
    f: string,
    lineHeight: number,
    color: string,
    x: number = left,
    w: number = contentWidth,
  ) => {
    for (const line of wrapText(value, w, f, measure)) {
      text(line, x, y + lineHeight / 2, f, color);
      y += lineHeight;
    }
  };

  const layoutQuestion = (question: Question) => {
    const top = y;
    const pillFont = font(700, 20);
    const pillLabel = '예측해 보세요';
    const pillWidth = measure(pillLabel, pillFont) + 34;
    items.push({
      kind: 'box',
      rect: { x: left, y, w: pillWidth, h: 38 },
      fill: COLORS.accent,
      radius: 19,
    });
    text(pillLabel, left + 17, y + 19, pillFont, '#ffffff');
    y += 38 + 18;

    flow(question.prompt, font(600, 25), 40, COLORS.ink);
    y += 10;

    const choicesTop = y;
    const choiceFont = font(500, 25);
    question.choices.forEach((choice, index) => {
      const rowHeight = 54;
      const box = { x: left + 4, y: y + 11, w: 32, h: 32 };
      const labelText = `${CIRCLED[index] ?? `${index + 1}.`} ${choice.label}`;
      const labelWidth = measure(labelText, choiceFont);
      items.push({
        kind: 'box',
        rect: box,
        fill: '#fffdf8',
        stroke: COLORS.ink,
        lineWidth: 2.5,
        radius: 7,
      });
      text(labelText, left + 54, y + rowHeight / 2, choiceFont, COLORS.body);
      regions.push({
        kind: 'choice',
        questionId: question.id,
        choiceId: choice.id,
        isAnswer: choice.id === question.answerId,
        rect: { x: left - 8, y, w: Math.min(contentWidth + 8, 54 + labelWidth + 36), h: rowHeight },
        box,
        label: { x: left + 46, y: y + 4, w: labelWidth + 16, h: rowHeight - 8 },
      });
      y += rowHeight;
    });
    const choicesBottom = y;
    y += 8;

    flow('보기를 고른 뒤 아래 덮개를 들춰 정답을 확인하세요.', font(400, 19), 30, COLORS.muted);
    y += 12;

    // 덮개 아래에 숨는 정답과 해설
    const answerTop = y;
    const pad = 24;
    const answerItems: DrawItem[] = [];
    let answerY = answerTop + pad;
    const answerIndex = question.choices.findIndex((choice) => choice.id === question.answerId);
    const answer = question.choices[answerIndex];
    const answerFont = font(800, 26);
    answerItems.push({
      kind: 'text',
      x: left + pad,
      y: answerY + 19,
      text: `정답  ${CIRCLED[answerIndex] ?? ''} ${answer?.label ?? ''}`,
      font: answerFont,
      color: COLORS.accent,
    });
    answerY += 38 + 8;
    const explanationFont = font(400, 22);
    for (const line of wrapText(
      question.explanation,
      contentWidth - pad * 2,
      explanationFont,
      measure,
    )) {
      answerItems.push({
        kind: 'text',
        x: left + pad,
        y: answerY + 18,
        text: line,
        font: explanationFont,
        color: COLORS.body,
      });
      answerY += 36;
    }
    const answerHeight = Math.max(answerY - answerTop + pad - 8, 130);
    regions.push({
      kind: 'answer',
      questionId: question.id,
      rect: { x: left, y: answerTop, w: contentWidth, h: answerHeight },
      items: answerItems,
    });
    y = answerTop + answerHeight + 26;

    // 맞히면 보기 오른쪽 빈자리에 도장이 찍힌다.
    const radius = Math.min(76, (choicesBottom - choicesTop) / 2 + 8);
    regions.push({
      kind: 'stamp',
      questionId: question.id,
      x: right - radius - 18,
      y: Math.max(top + radius, (choicesTop + choicesBottom) / 2),
      radius,
    });
  };

  const layoutBlock = (block: PageBlock) => {
    switch (block.type) {
      case 'eyebrow':
        text(block.text, left, y + 15, font(700, 21), COLORS.accent);
        y += 30 + 14;
        break;
      case 'heading':
        flow(block.text, font(800, 52), 64, COLORS.ink);
        y += 22;
        break;
      case 'subheading':
        flow(block.text, font(700, 30), 42, COLORS.ink);
        y += 12;
        break;
      case 'paragraph':
        flow(block.text, font(400, 25), 43, COLORS.body);
        y += 20;
        break;
      case 'list': {
        const markerFont = font(700, 25);
        block.items.forEach((item, index) => {
          const marker = block.ordered ? `${index + 1}` : '•';
          if (block.ordered) {
            items.push({
              kind: 'box',
              rect: { x: left, y: y + 6, w: 31, h: 31 },
              fill: COLORS.ink,
              radius: 16,
            });
            text(marker, left + 15.5, y + 22, font(700, 18), '#ffffff', 'center');
          } else {
            text(marker, left + 6, y + 21.5, markerFont, COLORS.accent);
          }
          flow(item, font(400, 25), 43, COLORS.body, left + 46, contentWidth - 46);
          y += 10;
        });
        y += 12;
        break;
      }
      case 'formula': {
        const formulaFont = font(700, 28);
        const noteFont = font(400, 20);
        const inner = contentWidth - 64;
        const lines = wrapText(block.text, inner, formulaFont, measure);
        const noteLines = block.note ? wrapText(block.note, inner, noteFont, measure) : [];
        const boxHeight =
          26 + lines.length * 42 + (noteLines.length > 0 ? 8 + noteLines.length * 31 : 0) + 24;
        items.push({
          kind: 'box',
          rect: { x: left, y, w: contentWidth, h: boxHeight },
          fill: COLORS.accentSoft,
          stroke: COLORS.accentLine,
          lineWidth: 2,
          radius: 14,
        });
        let lineY = y + 26;
        for (const line of lines) {
          text(line, left + contentWidth / 2, lineY + 21, formulaFont, COLORS.ink, 'center');
          lineY += 42;
        }
        if (noteLines.length > 0) lineY += 8;
        for (const line of noteLines) {
          text(line, left + contentWidth / 2, lineY + 15, noteFont, COLORS.muted, 'center');
          lineY += 31;
        }
        y += boxHeight + 26;
        break;
      }
      case 'question':
        layoutQuestion(block.question);
        break;
      case 'caption': {
        const captionFont = font(400, 21);
        if (block.placement === 'bottom') {
          const lines = wrapText(block.text, contentWidth, captionFont, measure);
          let captionY = bottomLimit - lines.length * 34;
          for (const line of lines) {
            text(line, left, captionY + 17, captionFont, COLORS.muted);
            captionY += 34;
          }
        } else {
          flow(block.text, captionFont, 34, COLORS.muted);
          y += 12;
        }
        break;
      }
      case 'toc': {
        const titleFont = font(600, 28);
        const numberFont = font(500, 24);
        for (const entry of block.entries) {
          const rowHeight = 64;
          const center = y + rowHeight / 2;
          const number = options.pageNumberOf?.(entry.pageId);
          const numberText = number === undefined ? '' : String(number);
          const titleWidth = measure(entry.title, titleFont);
          const numberWidth = measure(numberText, numberFont);
          text(entry.title, left, center, titleFont, COLORS.ink);
          text(numberText, right, center, numberFont, COLORS.muted, 'right');
          items.push({
            kind: 'line',
            x1: left + titleWidth + 16,
            y1: center + 8,
            x2: right - numberWidth - 14,
            y2: center + 8,
            color: COLORS.muted,
            lineWidth: 2,
            dash: [2, 9],
          });
          regions.push({
            kind: 'link',
            pageId: entry.pageId,
            rect: { x: left - 10, y, w: contentWidth + 20, h: rowHeight },
          });
          y += rowHeight;
        }
        y += 16;
        break;
      }
      case 'lines':
        for (let i = 0; i < block.count; i++) {
          y += 54;
          items.push({
            kind: 'line',
            x1: left,
            y1: y,
            x2: right,
            y2: y,
            color: 'rgba(138, 127, 114, 0.35)',
            lineWidth: 1.5,
          });
        }
        y += 20;
        break;
      case 'table': {
        const labelFont = font(700, 23);
        const valueFont = font(600, 25);
        const labelWidth = 236;
        const lineHeight = 38;
        for (const [label, value] of block.rows) {
          const lines = wrapText(value, contentWidth - labelWidth - 12, valueFont, measure);
          const rowHeight = Math.max(60, lines.length * lineHeight + 22);
          const center = y + rowHeight / 2;
          text(label, left, center, labelFont, COLORS.accent);
          lines.forEach((line, index) => {
            const lineCenter = center + (index - (lines.length - 1) / 2) * lineHeight;
            text(line, left + labelWidth, lineCenter, valueFont, COLORS.ink);
          });
          y += rowHeight;
          items.push({
            kind: 'line',
            x1: left,
            y1: y,
            x2: right,
            y2: y,
            color: 'rgba(138, 127, 114, 0.35)',
            lineWidth: 1.5,
          });
        }
        y += 22;
        break;
      }
      case 'grid':
      case 'figure': {
        const step = 26;
        const top = y;
        const bottom = Math.min(bottomLimit, top + (block.height ?? bottomLimit - top - 110));
        const line = (x1: number, y1: number, x2: number, y2: number, major: boolean) =>
          items.push({
            kind: 'line',
            x1,
            y1,
            x2,
            y2,
            color: major ? COLORS.gridMajor : COLORS.gridMinor,
            lineWidth: major ? 1.6 : 1,
          });
        for (let i = 0; left + i * step <= right + 0.5; i++) {
          line(left + i * step, top, left + i * step, bottom, i % 5 === 0);
        }
        for (let i = 0; top + i * step <= bottom + 0.5; i++) {
          line(left, top + i * step, right, top + i * step, i % 5 === 0);
        }
        if (block.type === 'figure') {
          const rect = { x: left, y: top, w: right - left, h: bottom - top };
          items.push({ kind: 'figure', rect, draw: block.draw });
          regions.push({ kind: 'figure', rect });
        }
        y = bottom + 20;
        break;
      }
      case 'spacer':
        y += block.size;
        break;
    }
  };

  for (const block of page.blocks) layoutBlock(block);

  if (options.pageNumber !== undefined) {
    const numberFont = font(500, 20);
    if (side === 'left')
      text(String(options.pageNumber), left, height - 62, numberFont, COLORS.muted);
    else text(String(options.pageNumber), right, height - 62, numberFont, COLORS.muted, 'right');
  }

  return { items, regions, overflow: y > bottomLimit };
}

/** 표지: 가운데 정렬, 천 위에 상아색 글씨 */
function layoutCover(page: PageSpec, options: LayoutOptions): PageLayout {
  const { width, height, measure, fontFamily } = options;
  const font = (weight: number, size: number) => fontOf(fontFamily, weight, size);
  const items: DrawItem[] = [];
  const center = width / 2;
  const maxWidth = width - 220;
  let y = page.style === 'cover-front' ? height * 0.17 : height * 0.74;

  const centered = (value: string, f: string, lineHeight: number, color: string) => {
    for (const line of wrapText(value, maxWidth, f, measure)) {
      items.push({
        kind: 'text',
        x: center,
        y: y + lineHeight / 2,
        text: line,
        font: f,
        color,
        align: 'center',
      });
      y += lineHeight;
    }
  };

  for (const block of page.blocks) {
    if (block.type === 'eyebrow') {
      centered(block.text, font(600, 24), 36, 'rgba(244, 234, 210, 0.72)');
      y += 24;
    } else if (block.type === 'heading') {
      centered(block.text, font(900, 96), 112, COLORS.ivory);
      y += 20;
    } else if (block.type === 'paragraph' || block.type === 'subheading') {
      centered(block.text, font(400, 30), 46, 'rgba(244, 234, 210, 0.86)');
      y += 12;
    } else if (block.type === 'spacer') {
      y += block.size;
    }
  }
  return { items, regions: [], overflow: y > height - MARGIN.bottom };
}
