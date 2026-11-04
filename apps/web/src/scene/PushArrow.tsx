import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import { InkLines } from '../ink/Ink.tsx';
import { inkMaterial } from '../ink/inkMaterial.ts';

interface PushArrowProps {
  /** 매 프레임 부르는 값(+면 오른쪽, -면 왼쪽) */
  getValue: () => number;
  /** 값 1이 화살표 몇 단위 길이인지 */
  scale: number;
  /** 화살표 꼬리가 놓일 곳을 매 프레임 알려 준다. */
  getOrigin: () => [number, number, number];
  color: string;
}

const HEAD = 0.026;

/** 속도·운동량처럼 방향이 있는 양을 나타내는 수평 화살표 */
export function PushArrow({ getValue, scale, getOrigin, color }: PushArrowProps) {
  const group = useRef<THREE.Group>(null);
  const shaft = useRef<THREE.Mesh>(null);
  const head = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!group.current || !shaft.current || !head.current) return;
    const value = getValue();
    const length = Math.abs(value) * scale;
    group.current.visible = length > 0.008;
    if (!group.current.visible) return;
    const direction = Math.sign(value);
    const [x, y, z] = getOrigin();
    group.current.position.set(x, y, z);
    group.current.scale.x = direction;
    const body = Math.max(0.001, length - HEAD);
    shaft.current.scale.y = body;
    shaft.current.position.x = body / 2;
    head.current.position.x = body + HEAD / 2;
  });

  return (
    <group ref={group} visible={false}>
      <mesh ref={shaft} rotation-z={-Math.PI / 2} material={inkMaterial(color)}>
        <cylinderGeometry args={[0.006, 0.006, 1, 10]} />
        <InkLines edges={false} width={1} />
      </mesh>
      <mesh ref={head} rotation-z={-Math.PI / 2} material={inkMaterial(color)}>
        <coneGeometry args={[0.016, HEAD, 14]} />
        <InkLines edges={false} width={1} />
      </mesh>
    </group>
  );
}
