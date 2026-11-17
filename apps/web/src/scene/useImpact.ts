import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { createImpact, type Impact } from '../fx/impact.ts';
import { viewportOf } from '../fx/viewport.ts';

/**
 * 충돌·착지 효과. 장면에 `<primitive object={impact.group} />`를 넣고,
 * 부딪히는 순간 `impact.fire(x, y, z)`를 부른다(장면 좌표).
 */
export function useImpact(seed = 3): Impact {
  const impact = useMemo(() => createImpact(seed), [seed]);
  useEffect(() => () => impact.dispose(), [impact]);
  useFrame((state, delta) => impact.update(delta, ...viewportOf(state)));
  return impact;
}
