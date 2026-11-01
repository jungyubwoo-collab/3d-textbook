import {
  BOOK_BASE_Y,
  COVER_DEPTH,
  LEAF_GAP,
  PAGE_DEPTH,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  TEXTURE_HEIGHT,
  TEXTURE_WIDTH,
} from './constants.ts';
import type { Leaf } from './structure.ts';
import type { Rect } from './typeset.ts';

/**
 * 책장이 쌓이는 높이. 넘기지 않은 장은 오른쪽 더미에, 넘긴 장은 왼쪽 더미에 쌓인다.
 * 각 장의 높이는 넘김 여부와 무관하게 정해지므로 미리 계산해 둔다.
 */
export interface Stack {
  thickness: number[];
  /** 오른쪽 더미에 있을 때 장의 중심 높이 */
  right: number[];
  /** 왼쪽 더미에 있을 때 장의 중심 높이 */
  left: number[];
}

/** 장 두께와 장 사이 간격을 더한 높이 */
function stackHeight(thickness: number[]): number {
  return thickness.reduce((total, value) => total + value + LEAF_GAP, 0);
}

export function computeStack(leaves: Leaf[]): Stack {
  const thickness = leaves.map((leaf) => (leaf.cover ? COVER_DEPTH : PAGE_DEPTH));
  return {
    thickness,
    right: thickness.map((t, i) => BOOK_BASE_Y + stackHeight(thickness.slice(i + 1)) + t / 2),
    left: thickness.map((t, i) => BOOK_BASE_Y + stackHeight(thickness.slice(0, i)) + t / 2),
  };
}

/** 펼침면 s 에서 오른쪽·왼쪽 페이지 윗면의 높이 */
export function surfaceHeights(stack: Stack, spread: number): { left?: number; right?: number } {
  const result: { left?: number; right?: number } = {};
  const right = stack.right[spread];
  if (right !== undefined) result.right = right + stack.thickness[spread]! / 2;
  const left = stack.left[spread - 1];
  if (left !== undefined) result.left = left + stack.thickness[spread - 1]! / 2;
  return result;
}

/** 페이지 텍스처 좌표(px)의 사각형을 책 좌표(책상 위 XZ)로 바꾼다. */
export function pageRectToBook(
  rect: Rect,
  side: 'left' | 'right',
): { x: number; z: number; w: number; h: number } {
  const sx = PAGE_WIDTH / TEXTURE_WIDTH;
  const sz = PAGE_HEIGHT / TEXTURE_HEIGHT;
  const x0 = side === 'left' ? -PAGE_WIDTH : 0;
  return {
    x: x0 + (rect.x + rect.w / 2) * sx,
    z: -PAGE_HEIGHT / 2 + (rect.y + rect.h / 2) * sz,
    w: rect.w * sx,
    h: rect.h * sz,
  };
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** 살짝 지나쳤다가 돌아오는 튀어 오름 */
export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}
