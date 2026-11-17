import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { BEAM_FRAGMENT, BEAM_VERTEX } from '../fx/beam.ts';
import { glowTexture } from '../fx/sprites.ts';
import { setUniform } from '../fx/uniforms.ts';
import { viewportOf } from '../fx/viewport.ts';
import { mulberry32 } from '../lib/random.ts';
import { createTextTexture, fontOf } from '../scene/canvasText.ts';
import { LAMP, stage } from './stageState.ts';

type Point = [number, number, number];

const UP = new THREE.Vector3(0, 1, 0);

/** from에서 to까지 놓인 방향과 길이 */
function span(from: Point, to: Point) {
  const a = new THREE.Vector3(...from);
  const direction = new THREE.Vector3(...to).sub(a);
  const length = direction.length();
  return {
    middle: a.clone().addScaledVector(direction, 0.5),
    quaternion: new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize()),
    length,
  };
}

/** 두 점을 잇는 둥근 막대 */
function Rod({
  from,
  to,
  radius,
  children,
}: {
  from: Point;
  to: Point;
  radius: number;
  children: ReactNode;
}) {
  const { middle, quaternion, length } = useMemo(() => span(from, to), [from, to]);
  return (
    <mesh position={middle} quaternion={quaternion} castShadow>
      <cylinderGeometry args={[radius, radius, length, 14]} />
      {children}
    </mesh>
  );
}

const LAMP_BASE: Point = [1.5, 0.012, -0.72];
const LAMP_JOINT: Point = [1.5, 0.03, -0.72];
const LAMP_ELBOW: Point = [1.6, 0.56, -0.8];
const BEAM = span(LAMP.head, LAMP.aim);

const DUST_VERTEX = /* glsl */ `
attribute vec4 aSeed; // 위상, 빠르기, 크기, 깜빡임 위상
uniform float uTime;
uniform float uScale;
varying float vAlpha;
void main() {
  vec3 p = position;
  p.x += sin(uTime * 0.25 * aSeed.y + aSeed.x) * 0.05;
  p.y += sin(uTime * 0.18 * aSeed.y + aSeed.x * 1.7) * 0.05;
  p.z += cos(uTime * 0.21 * aSeed.y + aSeed.x * 0.6) * 0.05;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSeed.z * uScale / max(0.001, -mv.z);
  vAlpha = 0.45 + 0.55 * sin(uTime * 0.9 * aSeed.y + aSeed.w);
}
`;

const DUST_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(uColor, texture2D(uMap, gl_PointCoord).a * vAlpha * uOpacity);
  #include <colorspace_fragment>
}
`;

/** 스탠드의 빛줄기 속을 떠다니는 먼지 */
function createDust(count: number): THREE.BufferGeometry {
  const random = mulberry32(23);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    // 갓에서 멀어질수록 넓게 퍼진 원뿔 안에 뿌린다(갓 기준 좌표: +y가 빛이 가는 쪽).
    const along = 0.22 + random() * 0.78;
    const radius = Math.sqrt(random()) * 0.38 * along;
    const angle = random() * Math.PI * 2;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = along * BEAM.length;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
    seeds[i * 4] = random() * Math.PI * 2;
    seeds[i * 4 + 1] = 0.5 + random();
    seeds[i * 4 + 2] = 0.008 + random() * 0.014;
    seeds[i * 4 + 3] = random() * Math.PI * 2;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  return geometry;
}

/**
 * 책상 스탠드. 3D 실험을 켜면 불이 들어와 빛줄기가 오른쪽 페이지의 장치로 떨어지고,
 * 그 안에서 먼지가 반짝인다(실제 조명은 Stage.tsx의 스포트라이트).
 */
function Lamp() {
  const bulb = useRef<THREE.MeshStandardMaterial>(null);
  const halo = useRef<THREE.SpriteMaterial>(null);
  const beamUniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color('#ffe7b8') }, uOpacity: { value: 0 } }),
    [],
  );
  const dustUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uScale: { value: 1000 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color('#fff3d2') },
      uMap: { value: glowTexture() },
    }),
    [],
  );
  const dust = useMemo(() => createDust(90), []);
  useEffect(() => () => dust.dispose(), [dust]);
  const beam = useRef<THREE.Mesh>(null);
  const beamMaterial = useRef<THREE.ShaderMaterial>(null);
  const motes = useRef<THREE.Points>(null);
  const dustMaterial = useRef<THREE.ShaderMaterial>(null);
  const time = useRef(0);

  useFrame((state, delta) => {
    const s = stage.level;
    time.current += delta;
    if (bulb.current) bulb.current.emissiveIntensity = THREE.MathUtils.lerp(0.12, 2.6, s);
    if (halo.current) halo.current.opacity = 0.75 * s;
    setUniform(beamMaterial.current, 'uOpacity', 0.2 * s);
    setUniform(dustMaterial.current, 'uOpacity', 0.7 * s);
    setUniform(dustMaterial.current, 'uTime', time.current);
    const [pixelHeight, fov] = viewportOf(state);
    setUniform(dustMaterial.current, 'uScale', pixelHeight / (2 * Math.tan((fov * Math.PI) / 360)));
    if (beam.current) beam.current.visible = s > 0.01;
    if (motes.current) motes.current.visible = s > 0.01;
  });

  return (
    <group>
      <mesh position={LAMP_BASE} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.13, 0.024, 36]} />
        <meshStandardMaterial color="#2f3b45" roughness={0.5} metalness={0.35} />
      </mesh>
      <Rod from={LAMP_JOINT} to={LAMP_ELBOW} radius={0.011}>
        <meshStandardMaterial color="#c9ced3" roughness={0.35} metalness={0.7} />
      </Rod>
      <Rod from={LAMP_ELBOW} to={LAMP.head} radius={0.011}>
        <meshStandardMaterial color="#c9ced3" roughness={0.35} metalness={0.7} />
      </Rod>
      <mesh position={LAMP_ELBOW} castShadow>
        <sphereGeometry args={[0.022, 16, 12]} />
        <meshStandardMaterial color="#2f3b45" roughness={0.5} metalness={0.35} />
      </mesh>
      {/* 갓: +y가 빛이 나가는 쪽 */}
      <group position={LAMP.head} quaternion={BEAM.quaternion}>
        <mesh position={[0, 0.07, 0]} rotation-x={Math.PI} castShadow>
          <coneGeometry args={[0.13, 0.18, 32, 1, true]} />
          <meshStandardMaterial color="#e0562f" roughness={0.45} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <sphereGeometry args={[0.045, 20, 14]} />
          <meshStandardMaterial
            ref={bulb}
            color="#fff7dc"
            emissive="#ffd487"
            emissiveIntensity={0.12}
            toneMapped={false}
          />
        </mesh>
        <sprite position={[0, 0.11, 0]} scale={[0.55, 0.55, 1]} renderOrder={6}>
          <spriteMaterial
            ref={halo}
            map={glowTexture()}
            color="#ffdf9e"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </sprite>
        <mesh ref={beam} position={[0, 0.12 + BEAM.length / 2, 0]} renderOrder={5} visible={false}>
          <cylinderGeometry args={[0.46, 0.06, BEAM.length, 40, 1, true]} />
          <shaderMaterial
            ref={beamMaterial}
            uniforms={beamUniforms}
            vertexShader={BEAM_VERTEX}
            fragmentShader={BEAM_FRAGMENT}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <points
          ref={motes}
          geometry={dust}
          position={[0, 0.12, 0]}
          frustumCulled={false}
          renderOrder={6}
          visible={false}
        >
          <shaderMaterial
            ref={dustMaterial}
            uniforms={dustUniforms}
            vertexShader={DUST_VERTEX}
            fragmentShader={DUST_FRAGMENT}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </points>
      </group>
    </group>
  );
}

/** 손글씨가 적힌 메모지 텍스처 */
function createNoteTexture(color: string, lines: string[], ink: string): THREE.CanvasTexture {
  return createTextTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.fillRect(0, 0, w, 34);
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      lines.forEach((line, index) => {
        ctx.font = fontOf(800, index === 0 ? 58 : 30);
        ctx.fillText(line, w / 2, index === 0 ? 118 : 118 + 58 * index);
      });
    },
    lines.join(' '),
  );
}

function Note({
  position,
  rotation,
  color,
  ink,
  lines,
}: {
  position: Point;
  rotation: number;
  color: string;
  ink: string;
  lines: string[];
}) {
  const texture = useMemo(() => createNoteTexture(color, lines, ink), [color, lines, ink]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, rotation]} receiveShadow>
      <planeGeometry args={[0.15, 0.15]} />
      <meshStandardMaterial map={texture} roughness={0.9} />
    </mesh>
  );
}

const NOTE_FORCE = ['F = ma', '힘 = 질량 × 가속도'];
const NOTE_ENERGY = ['E = ½mv²', '속력 2배 → 4배!'];

/** 연필: 육각 몸통, 깎은 끝, 지우개 */
function Pencil({ position, rotation }: { position: Point; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.34, 6]} />
        <meshStandardMaterial color="#f2b632" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.193, 0]} castShadow>
        <coneGeometry args={[0.012, 0.046, 6]} />
        <meshStandardMaterial color="#ecd3a6" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.211, 0]}>
        <coneGeometry args={[0.0042, 0.016, 6]} />
        <meshStandardMaterial color="#2d2a26" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.177, 0]}>
        <cylinderGeometry args={[0.0125, 0.0125, 0.014, 12]} />
        <meshStandardMaterial color="#c9ced3" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0, -0.196, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.026, 12]} />
        <meshStandardMaterial color="#f08f9d" roughness={0.85} />
      </mesh>
    </group>
  );
}

/**
 * 책상 위의 소품: 스탠드, 머그잔, 연필, 지우개, 메모지.
 * 책을 가리지 않게 매트 가장자리에 둔다. 장식이라 누를 수 없다.
 */
export function DeskProps() {
  return (
    <group>
      <Lamp />

      {/* 머그잔 */}
      <group position={[-1.4, 0.006, -0.84]}>
        <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.078, 0.066, 0.14, 36, 1, true]} />
          <meshStandardMaterial color="#f4efe6" roughness={0.35} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.004, 0]}>
          <cylinderGeometry args={[0.066, 0.066, 0.008, 36]} />
          <meshStandardMaterial color="#f4efe6" roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.118, 0]}>
          <cylinderGeometry args={[0.072, 0.072, 0.004, 36]} />
          <meshStandardMaterial color="#6b4630" roughness={0.25} />
        </mesh>
        <mesh position={[-0.09, 0.07, 0]} castShadow>
          <torusGeometry args={[0.04, 0.011, 12, 28]} />
          <meshStandardMaterial color="#f4efe6" roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.0795, 0.0675, 0.034, 36, 1, true]} />
          <meshStandardMaterial color="#e0562f" roughness={0.4} />
        </mesh>
      </group>

      <Pencil position={[-1.36, 0.018, 0.3]} rotation={1.25} />
      <Pencil position={[-1.27, 0.018, 0.36]} rotation={1.45} />

      {/* 지우개 */}
      <group position={[-1.34, 0.006, 0.68]} rotation-y={0.4}>
        <mesh position={[0, 0.016, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.11, 0.032, 0.05]} />
          <meshStandardMaterial color="#f7f4ee" roughness={0.9} />
        </mesh>
        <mesh position={[0.012, 0.0165, 0]}>
          <boxGeometry args={[0.064, 0.034, 0.052]} />
          <meshStandardMaterial color="#3f6fb0" roughness={0.7} />
        </mesh>
      </group>

      <Note
        position={[1.32, 0.0062, 0.52]}
        rotation={-0.14}
        color="#ffe27a"
        ink="#3b3631"
        lines={NOTE_FORCE}
      />
      <Note
        position={[1.39, 0.0068, 0.72]}
        rotation={0.2}
        color="#ffb3c1"
        ink="#3b3631"
        lines={NOTE_ENERGY}
      />
    </group>
  );
}
