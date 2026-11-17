import * as THREE from 'three';
import { easeOutBack } from '../book/stack.ts';
import { mulberry32 } from '../lib/random.ts';
import { createParticleBurst } from './particles.ts';
import { impactTexture, ringTexture, sparkleTexture } from './sprites.ts';

/**
 * 충돌·착지 순간의 만화식 효과: 뾰족한 별이 튀어나왔다 사라지고, 고리가 퍼지고, 불꽃이 튄다.
 * 장면마다 하나 만들어 두고 fire로 터뜨린다(연달아 터지면 가장 최근 것만 보인다).
 */
export interface Impact {
  group: THREE.Group;
  /** (x, y, z)에서 터뜨린다. size는 별의 지름(월드 단위) */
  fire: (x: number, y: number, z: number, size?: number) => void;
  update: (delta: number, pixelHeight: number, fovDegrees: number) => void;
  dispose: () => void;
}

const DURATION = 0.55;

export function createImpact(seed = 3): Impact {
  const group = new THREE.Group();
  const starMaterial = new THREE.SpriteMaterial({
    map: impactTexture(),
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const star = new THREE.Sprite(starMaterial);
  star.renderOrder = 8;
  const ringMaterial = new THREE.SpriteMaterial({
    map: ringTexture(),
    color: '#fff1c2',
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const ring = new THREE.Sprite(ringMaterial);
  ring.renderOrder = 7;
  const sparks = createParticleBurst(
    {
      count: 16,
      texture: sparkleTexture(),
      size: [0.02, 0.045],
      life: [0.35, 0.75],
      stagger: 0.04,
      gravity: 0.7,
      drag: 3,
      colors: ['#ffd23e', '#fff6cf', '#ff9a3c'],
      twinkle: 0.5,
      depthTest: false,
    },
    seed,
  );
  group.add(ring, star, sparks.points);
  group.visible = false;

  const random = mulberry32(seed + 17);
  let time = DURATION;
  let size = 0.12;

  return {
    group,
    fire(x, y, z, starSize = 0.12) {
      size = starSize;
      time = 0;
      star.position.set(x, y, z);
      ring.position.set(x, y, z);
      starMaterial.rotation = (random() - 0.5) * 0.9;
      sparks.fire((next, position, velocity) => {
        const angle = next() * Math.PI * 2;
        const speed = (0.25 + next() * 0.45) * (starSize / 0.12);
        position.set(x, y, z);
        velocity.set(Math.cos(angle) * speed, 0.1 + next() * 0.5 * speed, Math.sin(angle) * speed);
      });
      group.visible = true;
    },
    update(delta, pixelHeight, fovDegrees) {
      if (!group.visible) return;
      time += delta;
      const pop = easeOutBack(Math.min(1, time / 0.13));
      const fade = 1 - THREE.MathUtils.smoothstep(time, 0.26, 0.46);
      star.scale.setScalar(Math.max(0.0001, size * pop));
      starMaterial.opacity = fade;
      star.visible = time < DURATION;
      const spread = Math.min(1, time / 0.42);
      ring.scale.setScalar(size * (0.5 + 2.1 * spread));
      ringMaterial.opacity = 0.85 * (1 - spread);
      ring.visible = spread < 1;
      sparks.update(delta, pixelHeight, fovDegrees);
      if (time > DURATION && !sparks.points.visible) group.visible = false;
    },
    dispose() {
      starMaterial.dispose();
      ringMaterial.dispose();
      sparks.dispose();
    },
  };
}
