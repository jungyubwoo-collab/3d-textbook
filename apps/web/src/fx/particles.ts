import * as THREE from 'three';
import { mulberry32 } from '../lib/random.ts';

/**
 * 한 번에 터지는 입자들(반짝이, 불꽃, 먼지). 위치는 셰이더가 시간으로 계산하므로
 * 매 프레임 CPU에서 하는 일은 시간 값 하나를 올리는 것뿐이다.
 * 입자의 속도는 drag만큼 줄어들고 gravity만큼 아래로 당겨진다.
 */
export interface ParticleStyle {
  count: number;
  texture: THREE.Texture;
  /** 입자 크기(월드 단위) 범위 */
  size: [number, number];
  /** 수명(초) 범위 */
  life: [number, number];
  /** 입자마다 이 시간 안에서 늦게 태어난다(초) */
  stagger: number;
  /** 아래로 당기는 가속도 */
  gravity: number;
  /** 속도가 줄어드는 빠르기(1/초) */
  drag: number;
  colors: string[];
  /** 반짝임(크기가 떨리는 정도, 0~1) */
  twinkle: number;
  blending?: THREE.Blending;
  /** 다른 물체 뒤에 가려지게 할지(기본 true) */
  depthTest?: boolean;
}

/** 입자 하나가 태어나는 자리와 처음 속도를 채운다. random은 0 이상 1 미만. */
export type Spawn = (
  random: () => number,
  position: THREE.Vector3,
  velocity: THREE.Vector3,
  index: number,
) => void;

export interface ParticleBurst {
  points: THREE.Points;
  /** 입자를 새로 터뜨린다. 진행 중이던 것은 처음부터 다시 시작한다. */
  fire: (spawn: Spawn) => void;
  /** 매 프레임: 시간을 올리고 화면 크기에 맞춘다. pixelHeight는 그리기 버퍼 세로 픽셀 수. */
  update: (delta: number, pixelHeight: number, fovDegrees: number) => void;
  /** 전체 밝기(0~1) */
  setOpacity: (opacity: number) => void;
  dispose: () => void;
}

const VERTEX = /* glsl */ `
attribute vec3 aVelocity;
attribute vec4 aSeed; // 크기, 수명, 늦게 태어나는 시간, 반짝임 위상
attribute vec3 aColor;
uniform float uTime;
uniform float uGravity;
uniform float uDrag;
uniform float uScale;
uniform float uTwinkle;
varying float vAlpha;
varying vec3 vColor;

void main() {
  float t = uTime - aSeed.z;
  float life = aSeed.y;
  float alive = step(0.0, t) * step(t, life);
  // 줄어드는 속도 v0·e^(-kt)를 시간으로 적분한 거리
  float travel = (1.0 - exp(-uDrag * t)) / max(uDrag, 0.0001);
  vec3 p = position + aVelocity * travel + vec3(0.0, -0.5 * uGravity * t * t, 0.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float u = clamp(t / life, 0.0, 1.0);
  float twinkle = 1.0 - uTwinkle * (0.5 + 0.5 * sin(t * 17.0 + aSeed.w));
  vAlpha = alive * smoothstep(0.0, 0.1, u) * (1.0 - smoothstep(0.5, 1.0, u));
  gl_PointSize = alive * aSeed.x * twinkle * uScale / max(0.001, -mv.z);
  vColor = aColor;
}
`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uOpacity;
varying float vAlpha;
varying vec3 vColor;

void main() {
  vec4 tex = texture2D(uMap, gl_PointCoord);
  // 가운데(진한 곳)는 흰빛, 가장자리는 입자 색
  vec3 color = mix(vColor, vec3(1.0), pow(tex.a, 3.0) * 0.85);
  gl_FragColor = vec4(color, tex.a * vAlpha * uOpacity);
  #include <colorspace_fragment>
}
`;

export function createParticleBurst(style: ParticleStyle, seed = 1): ParticleBurst {
  const { count } = style;
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  const colors = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  const velocityAttribute = new THREE.BufferAttribute(velocities, 3);
  const seedAttribute = new THREE.BufferAttribute(seeds, 4);
  geometry.setAttribute('position', positionAttribute);
  geometry.setAttribute('aVelocity', velocityAttribute);
  geometry.setAttribute('aSeed', seedAttribute);
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

  const uniforms = {
    uTime: { value: 0 },
    uGravity: { value: style.gravity },
    uDrag: { value: style.drag },
    uScale: { value: 1000 },
    uTwinkle: { value: style.twinkle },
    uOpacity: { value: 1 },
    uMap: { value: style.texture },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    depthTest: style.depthTest ?? true,
    blending: style.blending ?? THREE.NormalBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.visible = false;
  points.renderOrder = 5;

  const random = mulberry32(seed);
  const palette = style.colors.map((value) => new THREE.Color(value));
  const position = new THREE.Vector3();
  const velocity = new THREE.Vector3();
  const longest = style.life[1] + style.stagger;

  return {
    points,
    fire(spawn) {
      for (let i = 0; i < count; i++) {
        position.set(0, 0, 0);
        velocity.set(0, 0, 0);
        spawn(random, position, velocity, i);
        position.toArray(positions, i * 3);
        velocity.toArray(velocities, i * 3);
        seeds[i * 4] = THREE.MathUtils.lerp(style.size[0], style.size[1], random());
        seeds[i * 4 + 1] = THREE.MathUtils.lerp(style.life[0], style.life[1], random());
        seeds[i * 4 + 2] = random() * style.stagger;
        seeds[i * 4 + 3] = random() * Math.PI * 2;
        const color = palette[Math.floor(random() * palette.length)] ?? palette[0];
        color?.toArray(colors, i * 3);
      }
      for (const attribute of Object.values(geometry.attributes)) attribute.needsUpdate = true;
      uniforms.uTime.value = 0;
      points.visible = true;
    },
    update(delta, pixelHeight, fovDegrees) {
      if (!points.visible) return;
      uniforms.uTime.value += delta;
      uniforms.uScale.value = pixelHeight / (2 * Math.tan((fovDegrees * Math.PI) / 360));
      if (uniforms.uTime.value > longest) points.visible = false;
    },
    setOpacity(opacity) {
      uniforms.uOpacity.value = opacity;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
