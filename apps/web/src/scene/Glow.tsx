import type { ThreeElements } from '@react-three/fiber';
import { AdditiveBlending } from 'three';
import { glowTexture } from '../fx/sprites.ts';

/** 물체 둘레의 은은한 빛(항상 카메라를 향한다). 어두운 실험 무대에서 물체가 빛나 보인다. */
export function Glow({
  color,
  size,
  opacity = 0.6,
  ...props
}: { color: string; size: number; opacity?: number } & Omit<ThreeElements['sprite'], 'scale'>) {
  return (
    <sprite scale={[size, size, 1]} renderOrder={4} {...props}>
      <spriteMaterial
        map={glowTexture()}
        color={color}
        transparent
        opacity={opacity}
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );
}
