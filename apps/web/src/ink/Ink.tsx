import { Edges, Outlines } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { COLORS } from '../book/constants.ts';

/**
 * 메시에 잉크 선을 두른다. 메시의 자식으로 넣는다.
 * - edges: 모서리(각진 면이 만나는 선)
 * - outline: 바깥 윤곽선
 *
 * 주의: drei 10의 Outlines는 screenspace를 끈 상태(기본값)에서 thickness를 화면 픽셀로 쓰고,
 * screenspace를 켜면 월드 단위로 쓴다(이름과 반대). 여기서는 기본값 + 픽셀 두께를 쓴다.
 * drei를 올린 뒤에는 장면이 검게 뒤덮이지 않는지 꼭 화면으로 확인할 것.
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
  return (
    <>
      {edges && <Edges threshold={threshold} lineWidth={width} color={COLORS.ink} />}
      {outline && <Outlines thickness={width * 1.3 * dpr} color={COLORS.ink} />}
    </>
  );
}
