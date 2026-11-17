import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { BEAM_FRAGMENT, BEAM_VERTEX } from '../fx/beam.ts';
import { createParticleBurst } from '../fx/particles.ts';
import { ringTexture, sparkleTexture } from '../fx/sprites.ts';
import { setUniform } from '../fx/uniforms.ts';
import { viewportOf } from '../fx/viewport.ts';
import { REDUCED_MOTION } from './constants.ts';
import { pageRectToBook } from './stack.ts';
import type { PageSpec } from './types.ts';
import { createFigureCover } from './usePageAsset.ts';

const { clamp, lerp, smoothstep } = THREE.MathUtils;

/** 등장 시간이 이만큼 흐르면 그림 칸이 다 덮인다. */
const WIPE_END = 0.2;
const GOLD = '#ffab1f';

/**
 * 그림 칸을 덮는 빈 모눈 종이. 가운데에서 둥글게 번져 나가며 인쇄된 그림을 지우고,
 * 번지는 경계는 금빛으로 빛난다(잉크가 번지듯 가장자리가 일렁인다).
 */
function createWipeCover(texture: THREE.Texture, aspect: number) {
  const uniforms = {
    uWipe: { value: 0 },
    uWipeAspect: { value: aspect },
    // 원이 모서리까지 닿는 반지름(세로 길이 기준)
    uWipeReach: { value: 0.5 * Math.hypot(aspect, 1) * 1.1 },
    uWipeColor: { value: new THREE.Color(GOLD) },
  };
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    roughness: 0.92,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <uv_pars_vertex>', '#include <uv_pars_vertex>\nvarying vec2 vWipeUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvWipeUv = uv;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
uniform float uWipe;
uniform float uWipeAspect;
uniform float uWipeReach;
uniform vec3 uWipeColor;
varying vec2 vWipeUv;`,
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `#include <map_fragment>
  vec2 wipePoint = (vWipeUv - 0.5) * vec2(uWipeAspect, 1.0);
  float wipeAngle = atan(wipePoint.y, wipePoint.x);
  float wipeRadius = uWipe * uWipeReach * (1.0 + 0.035 * sin(wipeAngle * 7.0 + uWipe * 9.0));
  float wipeDistance = length(wipePoint);
  float wipeCovered = 1.0 - smoothstep(wipeRadius - 0.03, wipeRadius, wipeDistance);
  float wipeRim = wipeCovered * smoothstep(wipeRadius - 0.13, wipeRadius - 0.02, wipeDistance);
  diffuseColor.a *= wipeCovered;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
  totalEmissiveRadiance += uWipeColor * wipeRim * 1.5;`,
      );
  };
  material.customProgramCacheKey = () => 'figure-wipe-v1';
  return {
    material,
    setProgress(value: number) {
      uniforms.uWipe.value = value;
    },
    dispose() {
      material.dispose();
    },
  };
}

function createSparkles() {
  return createParticleBurst(
    {
      count: 150,
      texture: sparkleTexture(),
      size: [0.014, 0.05],
      life: [1.1, 2.7],
      stagger: 0.55,
      gravity: -0.04,
      drag: 1.15,
      colors: ['#ffc23d', '#fff0c2', '#ff8f3a', '#ffe08a', '#9fd8ff'],
      twinkle: 0.75,
    },
    7,
  );
}

const RING_COUNT = 3;

/**
 * 2D 그림이 3D 실험으로 바뀌는 순간의 연출.
 * 1) 빛나는 원이 그림 한가운데서 번져 나가며 인쇄된 그림을 지우고(빈 모눈만 남는다),
 * 2) 잉크 물결이 페이지 위로 퍼지고, 3) 빛기둥이 한 번 솟고, 4) 금빛 반짝이가 피어오른다.
 * 실험을 접을 때는 원이 다시 오므라들며 그림이 인쇄된 상태로 돌아온다.
 */
export function RevealFx({
  page,
  y,
  reveal,
}: {
  page: PageSpec;
  y: number;
  reveal: RefObject<number>;
}) {
  const cover = useMemo(() => createFigureCover(page, 'right'), [page]);
  useEffect(() => () => cover?.texture.dispose(), [cover]);
  const area = useMemo(() => (cover ? pageRectToBook(cover.rect, 'right') : null), [cover]);
  const wipe = useMemo(
    () => (cover && area ? createWipeCover(cover.texture, area.w / area.h) : null),
    [cover, area],
  );
  useEffect(() => () => wipe?.dispose(), [wipe]);
  const sparkles = useMemo(() => createSparkles(), []);
  useEffect(() => () => sparkles.dispose(), [sparkles]);
  const pillarUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color('#ffe3a3') }, uOpacity: { value: 0 } }),
    [],
  );

  const coverMesh = useRef<THREE.Mesh>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const pillar = useRef<THREE.Mesh>(null);
  const pillarMaterial = useRef<THREE.ShaderMaterial>(null);
  const last = useRef(0);
  /** 펼치기 시작한 뒤 흐른 시간(초). 접는 중이거나 문서 상태면 음수 */
  const clock = useRef(-1);

  useFrame((state, delta) => {
    if (!wipe || !area) return;
    const value = reveal.current;
    const entering = value > last.current;
    if (entering && last.current === 0) {
      clock.current = 0;
      if (!REDUCED_MOTION) {
        sparkles.fire((random, position, velocity) => {
          const angle = random() * Math.PI * 2;
          const radius = Math.sqrt(random());
          position.set(
            area.x + Math.cos(angle) * radius * area.w * 0.42,
            y + 0.004,
            area.z + Math.sin(angle) * radius * area.h * 0.42,
          );
          const out = random() * 0.14;
          velocity.set(Math.cos(angle) * out, 0.28 + random() * 0.72, Math.sin(angle) * out);
        });
      }
    } else if (clock.current >= 0 && value > 0 && !(value < last.current)) {
      clock.current += delta;
    } else if (value < last.current || value === 0) {
      clock.current = -1;
    }
    last.current = value;

    const progress = smoothstep(value, 0, WIPE_END);
    wipe.setProgress(progress);
    if (coverMesh.current) coverMesh.current.visible = progress > 0;

    const t = clock.current;
    const reach = 0.5 * Math.hypot(area.w, area.h) * 1.1;
    rings.current.forEach((ring, index) => {
      const { material } = ring ?? {};
      if (!ring || !(material instanceof THREE.MeshBasicMaterial)) return;
      let radius = 0;
      let opacity = 0;
      if (index === 0) {
        // 그림을 지우는 원의 가장자리를 따라간다(접을 때는 함께 오므라든다).
        radius = progress * reach;
        opacity = progress > 0 && progress < 1 ? 0.95 * (1 - smoothstep(progress, 0.8, 1)) : 0;
      } else if (t >= 0 && !REDUCED_MOTION) {
        // 뒤따라 퍼지는 물결
        const u = clamp((t - 0.12 - index * 0.2) / 1.0, 0, 1);
        radius = lerp(0.04, 0.5 + index * 0.1, 1 - (1 - u) ** 3);
        opacity = u > 0 && u < 1 ? 0.75 * (1 - u) : 0;
      }
      ring.visible = opacity > 0.002;
      ring.scale.setScalar(Math.max(0.0001, radius / 0.9));
      material.opacity = opacity;
    });

    const flash =
      t >= 0 && !REDUCED_MOTION ? smoothstep(t, 0, 0.14) * (1 - smoothstep(t, 0.4, 1.35)) : 0;
    setUniform(pillarMaterial.current, 'uOpacity', 0.5 * flash);
    if (pillar.current) pillar.current.visible = flash > 0.002;

    sparkles.update(delta, ...viewportOf(state));
  });

  if (!cover || !area || !wipe) return null;
  return (
    <group>
      <mesh
        ref={coverMesh}
        position={[area.x, y + 0.0008, area.z]}
        rotation-x={-Math.PI / 2}
        material={wipe.material}
        visible={false}
        receiveShadow
      >
        <planeGeometry args={[area.w, area.h]} />
      </mesh>
      {Array.from({ length: RING_COUNT }, (_, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            rings.current[index] = mesh;
          }}
          position={[area.x, y + 0.0016 + index * 0.0002, area.z]}
          rotation-x={-Math.PI / 2}
          visible={false}
          renderOrder={2}
        >
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial
            map={ringTexture()}
            color={index === 0 ? GOLD : '#ff8a3a'}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh
        ref={pillar}
        position={[area.x, y + 0.45, area.z]}
        visible={false}
        renderOrder={3}
        scale={[area.w * 0.4, 1, area.h * 0.4]}
      >
        <cylinderGeometry args={[1.15, 0.9, 0.9, 48, 1, true]} />
        <shaderMaterial
          ref={pillarMaterial}
          uniforms={pillarUniforms}
          vertexShader={BEAM_VERTEX}
          fragmentShader={BEAM_FRAGMENT}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <primitive object={sparkles.points} />
    </group>
  );
}
