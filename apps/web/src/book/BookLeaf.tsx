import { useEffect, useLayoutEffect, useMemo } from 'react';
import {
  COLORS,
  COVER_DEPTH,
  COVER_HEIGHT,
  COVER_WIDTH,
  PAGE_DEPTH,
  PAGE_HEIGHT,
  PAGE_SEGMENTS,
  PAGE_WIDTH,
} from './constants.ts';
import { applyFace, createLeafRig, type LeafRig } from './leafRig.ts';
import type { Leaf } from './structure.ts';
import type { PageSpec } from './types.ts';
import { usePageTexture } from './usePageAsset.ts';

function faceColor(page: PageSpec): string {
  switch (page.style) {
    case 'cover-front':
    case 'cover-back':
      return COLORS.cloth;
    case 'endpaper':
      return COLORS.endpaper;
    default:
      return COLORS.paper;
  }
}

interface BookLeafProps {
  leaf: Leaf;
  /** 지금 펼친 면 근처인지. 가까운 장만 페이지 텍스처를 만든다. */
  near: boolean;
  register: (index: number, rig: LeafRig | null) => void;
}

/** 책장 한 장. 움직임은 <Book>이 매 프레임 뼈를 돌려서 만든다. */
export function BookLeaf({ leaf, near, register }: BookLeafProps) {
  const rig = useMemo(
    () =>
      leaf.cover
        ? createLeafRig({
            width: COVER_WIDTH,
            height: COVER_HEIGHT,
            depth: COVER_DEPTH,
            segments: 1,
            faceColor: COLORS.cloth,
            edgeColor: COLORS.clothDark,
            roughness: 0.75,
          })
        : createLeafRig({
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            depth: PAGE_DEPTH,
            segments: PAGE_SEGMENTS,
            faceColor: COLORS.paper,
            edgeColor: COLORS.paperEdge,
            roughness: 0.92,
          }),
    [leaf.cover],
  );

  useEffect(() => {
    register(leaf.index, rig);
    return () => {
      register(leaf.index, null);
      rig.dispose();
    };
  }, [leaf.index, rig, register]);

  const frontTexture = usePageTexture(leaf.front, 'right', near);
  const backTexture = usePageTexture(leaf.back, 'left', near);

  useLayoutEffect(() => {
    applyFace(rig.front, frontTexture, faceColor(leaf.front));
    applyFace(rig.back, backTexture, faceColor(leaf.back));
  }, [rig, frontTexture, backTexture, leaf]);

  return <primitive object={rig.mesh} />;
}
