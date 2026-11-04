import { useFrame, type ThreeElements } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { REDUCED_MOTION } from '../book/constants.ts';
import { useSceneRuntime } from '../book/runtime.ts';
import { easeOutBack } from '../book/stack.ts';

export type PopMode = 'rise' | 'grow' | 'hinge';

type PopUpProps = ThreeElements['group'] & {
  /** 등장 시간(0~1) 중 일어서기 시작하는 때 */
  at?: number;
  /** 일어서는 데 쓰는 등장 시간의 길이 */
  span?: number;
  mode?: PopMode;
};

/**
 * 팝업 장면의 한 부분. 페이지가 펼쳐진 뒤 등장 시간이 at에 이르면 span 동안 일어선다.
 * - rise: 페이지에 납작하게 인쇄된 도면이 위로 솟아오른다. 그룹의 원점을 페이지 바닥(y = 0)에 둔다.
 * - grow: 한 점에서 커지며 튀어나온다(작은 물건, 단추, 꼬리표).
 * - hinge: 종이 카드처럼 앞으로 누워 있다가 일으켜 세워진다.
 * 살짝 지나쳤다가 돌아오는 탄성이 있어 종이가 튀어 오르는 느낌을 준다.
 */
export function PopUp({ at = 0, span = 0.28, mode = 'rise', children, ...props }: PopUpProps) {
  const scene = useSceneRuntime();
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    const k = Math.min(1, Math.max(0, (scene.reveal.current - at) / span));
    const eased = REDUCED_MOTION ? k : easeOutBack(k);
    if (mode === 'rise') {
      group.scale.y = Math.max(0.001, eased);
    } else if (mode === 'grow') {
      group.scale.setScalar(Math.max(0.001, eased));
      group.visible = k > 0;
    } else {
      group.rotation.x = (1 - eased) * (Math.PI / 2);
    }
  });
  return (
    <group ref={ref} {...props}>
      {children}
    </group>
  );
}
