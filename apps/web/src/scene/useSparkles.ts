import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import { createParticleBurst } from '../fx/particles.ts';
import { sparkleTexture } from '../fx/sprites.ts';
import { viewportOf } from '../fx/viewport.ts';

const COLORS = ['#ffd23e', '#fff6cf', '#ff9a3c', '#8fd3ff', '#ff8fb0', '#a8e88a'];

/**
 * 축하 반짝이. 장면에 `<primitive object={sparkles.points} />`를 넣고,
 * 탐구를 마쳤을 때처럼 축하할 순간에 `sparkles.burst(x, y, z)`를 부른다(장면 좌표).
 */
export function useSparkles(count = 90, seed = 11) {
  const burst = useMemo(
    () =>
      createParticleBurst(
        {
          count,
          texture: sparkleTexture(),
          size: [0.02, 0.06],
          life: [0.9, 1.9],
          stagger: 0.25,
          gravity: 0.5,
          drag: 1.6,
          colors: COLORS,
          twinkle: 0.7,
          depthTest: false,
        },
        seed,
      ),
    [count, seed],
  );
  useEffect(() => () => burst.dispose(), [burst]);
  useFrame((state, delta) => burst.update(delta, ...viewportOf(state)));
  return useMemo(
    () => ({
      points: burst.points,
      /** (x, y, z)에서 사방으로 터뜨린다. power는 퍼지는 빠르기 */
      burst(x: number, y: number, z: number, power = 0.55) {
        burst.fire((random, position, velocity) => {
          const angle = random() * Math.PI * 2;
          const lift = random();
          const speed = power * (0.35 + random() * 0.65);
          position.set(x + (random() - 0.5) * 0.1, y + (random() - 0.5) * 0.04, z);
          velocity.set(
            Math.cos(angle) * speed * (1 - 0.5 * lift),
            speed * (0.5 + lift),
            Math.sin(angle) * speed * 0.6,
          );
        });
      },
    }),
    [burst],
  );
}
