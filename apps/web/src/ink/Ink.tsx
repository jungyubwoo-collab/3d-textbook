import { Edges, Outlines } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type * as THREE from 'three';
import { COLORS } from '../book/constants.ts';
import { verticalSquash } from './flatness.ts';

/** 이보다 납작하게 눌린 물체(페이지에 인쇄된 도면 상태)는 윤곽선 껍질을 숨긴다. */
const FLAT_LIMIT = 0.15;

/**
 * 메시에 잉크 선을 두른다. 메시의 자식으로 넣는다.
 * - edges: 모서리(각진 면이 만나는 선)
 * - outline: 바깥 윤곽선
 *
 * 주의: drei 10의 Outlines는 screenspace를 끈 상태(기본값)에서 thickness를 화면 픽셀로 쓰고,
 * screenspace를 켜면 월드 단위로 쓴다(이름과 반대). 여기서는 기본값 + 픽셀 두께를 쓴다.
 * drei를 올린 뒤에는 장면이 검게 뒤덮이지 않는지 꼭 화면으로 확인할 것.
 *
 * 팝업이 일어서기 전이나 책장을 넘기는 동안 물체가 거의 납작하게 눌리면, 윤곽선 껍질(뒷면)이
 * 앞면과 같은 깊이에 놓여 물체의 먼 쪽 절반을 검게 덮는다. 그동안은 껍질을 숨기고 모서리 선만 남긴다.
 */
export function InkLines({
  edges = true,
  outline = true,
  threshold = 24,
  width = 1.4,
}: {
  edges?: boolean;
  outline?: boolean;
  threshold?: number;
  /** 선 굵기(CSS 픽셀) */
  width?: number;
}) {
  const dpr = useThree((state) => state.viewport.dpr);
  // 윤곽선을 두를 메시(부모)를 찾기 위한 빈 그룹
  const probe = useRef<THREE.Group>(null);
  const flatNow = useRef(false);
  const [flat, setFlat] = useState(false);

  useFrame(() => {
    const mesh = probe.current?.parent;
    if (!mesh) return;
    const next = verticalSquash(mesh.matrixWorld) < FLAT_LIMIT;
    if (next === flatNow.current) return;
    flatNow.current = next;
    setFlat(next);
  });

  return (
    <>
      {edges && <Edges threshold={threshold} lineWidth={width} color={COLORS.ink} />}
      {outline && (
        <>
          <group ref={probe} />
          <Outlines visible={!flat} thickness={width * 1.3 * dpr} color={COLORS.ink} />
        </>
      )}
    </>
  );
}
