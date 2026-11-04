import { useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { book } from '../content/book.ts';
import { answerKey, useBookStore } from '../state/bookStore.ts';
import { TEXTURE_HEIGHT, TEXTURE_WIDTH } from './constants.ts';
import { FONT_FAMILY, measureText } from './fonts.ts';
import { paintPage, type AnswerViews } from './paint.ts';
import { pageNumber } from './structure.ts';
import { layoutPage, type PageLayout, type Rect } from './typeset.ts';
import type { PageSpec } from './types.ts';

export type PageSide = 'left' | 'right';

/** 페이지 배치 결과. 같은 페이지는 한 번만 계산한다. */
const layoutCache = new Map<string, PageLayout>();

export function getPageLayout(page: PageSpec, side: PageSide): PageLayout {
  const cacheKey = `${page.id}:${side}`;
  let layout = layoutCache.get(cacheKey);
  if (!layout) {
    layout = layoutPage(page, {
      width: TEXTURE_WIDTH,
      height: TEXTURE_HEIGHT,
      side,
      measure: measureText,
      fontFamily: FONT_FAMILY,
      pageNumber: pageNumber(book.pages, page.id),
      pageNumberOf: (id) => pageNumber(book.pages, id),
    });
    if (layout.overflow && import.meta.env.DEV) {
      console.warn(
        `페이지 "${page.id}"의 내용이 아래 여백을 넘칩니다. 내용을 줄이거나 페이지를 나누세요.`,
      );
    }
    layoutCache.set(cacheKey, layout);
  }
  return layout;
}

function repaint(
  asset: { context: CanvasRenderingContext2D; texture: THREE.CanvasTexture },
  page: PageSpec,
  side: PageSide,
  answers: AnswerViews,
): void {
  paintPage(asset.context, getPageLayout(page, side), {
    style: page.style ?? 'paper',
    side,
    seed: page.id,
    answers,
  });
  asset.texture.needsUpdate = true;
}

function questionIds(page: PageSpec): string[] {
  return page.blocks.flatMap((block) => (block.type === 'question' ? [block.question.id] : []));
}

/**
 * 2D 그림만 뺀 페이지(모눈과 글)를 그린 텍스처. 3D 실험을 하는 동안 그림 칸을 덮어,
 * 인쇄된 그림이 입체로 일어선 것처럼 보이게 한다. 텍스처는 그림 칸만 보이도록 잘라 둔다.
 */
export function createFigureCover(
  page: PageSpec,
  side: PageSide,
): { texture: THREE.CanvasTexture; rect: Rect } | null {
  const layout = getPageLayout(page, side);
  const region = layout.regions.find((entry) => entry.kind === 'figure');
  if (!region || typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) return null;
  paintPage(
    context,
    { ...layout, items: layout.items.filter((item) => item.kind !== 'figure'), regions: [] },
    { style: page.style ?? 'paper', side, seed: page.id, answers: {} },
  );
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const { rect } = region;
  texture.repeat.set(rect.w / TEXTURE_WIDTH, rect.h / TEXTURE_HEIGHT);
  texture.offset.set(rect.x / TEXTURE_WIDTH, 1 - (rect.y + rect.h) / TEXTURE_HEIGHT);
  return { texture, rect };
}

/** 이 페이지에 있는 문항들의 현재 답 */
export function usePageAnswers(page: PageSpec): AnswerViews {
  const ids = useMemo(() => questionIds(page), [page]);
  const answers = useBookStore(
    useShallow((state) => ids.map((id) => state.answers[answerKey(page.lessonId ?? '', id)])),
  );
  return useMemo(() => {
    const views: Record<string, AnswerViews[string]> = {};
    ids.forEach((id, index) => {
      const answer = answers[index];
      if (answer) {
        views[id] = {
          choiceId: answer.choiceId,
          revealed: answer.revealed,
          correct: answer.correct ?? false,
          stampPending: answer.stampPending ?? false,
        };
      }
    });
    return views;
  }, [ids, answers]);
}

/**
 * 페이지를 canvas에 그려 텍스처로 만든다. enabled가 false면 만들지 않는다
 * (가까운 펼침면의 페이지만 텍스처를 가져 GPU 메모리를 아낀다).
 */
export function usePageTexture(
  page: PageSpec,
  side: PageSide,
  enabled: boolean,
): THREE.CanvasTexture | null {
  const gl = useThree((state) => state.gl);
  const answers = usePageAnswers(page);

  const asset = useMemo(() => {
    if (!enabled) return null;
    const canvas = document.createElement('canvas');
    canvas.width = TEXTURE_WIDTH;
    canvas.height = TEXTURE_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    if (side === 'left') {
      // 뒷면(-y 면)은 넘긴 뒤 위아래·좌우가 모두 뒤집혀 보이므로 180도 돌린다.
      texture.center.set(0.5, 0.5);
      texture.rotation = Math.PI;
    }
    return { context, texture };
  }, [enabled, side, gl]);

  useLayoutEffect(() => {
    if (asset) repaint(asset, page, side, answers);
  }, [asset, page, side, answers]);

  useEffect(() => () => asset?.texture.dispose(), [asset]);

  return asset?.texture ?? null;
}
