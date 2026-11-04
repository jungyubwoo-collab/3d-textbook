import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { InkLines } from '../../../ink/Ink.tsx';
import { inkMaterial } from '../../../ink/inkMaterial.ts';
import { playSound } from '../../../lib/sound.ts';
import { Bars } from '../../../scene/Bars.tsx';
import { useLessonGate } from '../../../scene/gate.ts';
import { Label } from '../../../scene/Label.tsx';
import { ENERGY_COLORS, TINT } from '../../../scene/palette.ts';
import { PopUp } from '../../../scene/PopUp.tsx';
import { SceneButton } from '../../../scene/SceneButton.tsx';
import { GRAVITY } from '../physics.ts';
import {
  bobPosition,
  energiesOf,
  releasedAt,
  stepPendulum,
  type PendulumConfig,
  type PendulumState,
} from './physics.ts';
import { PENDULUM_QUESTION } from './ids.ts';

const PIVOT: [number, number, number] = [0, 0.585, -0.02];
/** 1 m가 장면에서 몇 단위인지 (줄 길이 1 m) */
const METER = 0.4;
const LENGTH = 1;
const PEG_DEPTH = 0.5;
const START = -(50 * Math.PI) / 180;
const SLOW = 1.5;
const TRAIL = 90;
const BOB = 0.03;

const toScene = (point: { x: number; y: number }): [number, number, number] => [
  PIVOT[0] + point.x * METER,
  PIVOT[1] + point.y * METER,
  PIVOT[2],
];

/** 처음 높이(가장 낮은 곳 기준)와 그때의 위치 에너지 */
const START_HEIGHT = LENGTH * (1 - Math.cos(START));
const START_ENERGY = GRAVITY * START_HEIGHT;

/** 줄이 못에 걸려도 추는 처음 높이까지 올라간다(역학적 에너지 보존). */
export function PendulumScene() {
  const { allow } = useLessonGate(PENDULUM_QUESTION);
  const [peg, setPeg] = useState(false);
  const [swinging, setSwinging] = useState(false);
  const config = useMemo<PendulumConfig>(
    () => ({ length: LENGTH, pegDepth: peg ? PEG_DEPTH : null }),
    [peg],
  );
  const state = useRef<PendulumState>(releasedAt(START));
  /** 바로 앞 프레임에 줄이 못에 걸려 있었는지(걸리는 순간 소리를 낸다) */
  const onPeg = useRef(false);
  const bob = useRef<THREE.Mesh>(null);
  const upper = useRef<THREE.Mesh>(null);
  const lower = useRef<THREE.Mesh>(null);
  const pegMesh = useRef<THREE.Group>(null);
  const trail = useMemo(() => createTrail(TRAIL, TINT.accent), []);
  useEffect(() => () => trail.dispose(), [trail]);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const direction = useMemo(() => new THREE.Vector3(), []);

  /** 두 점 사이에 줄(원기둥)을 놓는다. */
  const stretch = (
    mesh: THREE.Mesh | null,
    from: [number, number, number],
    to: [number, number, number],
  ) => {
    if (!mesh) return;
    direction.set(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
    const length = direction.length();
    mesh.visible = length > 0.001;
    mesh.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2);
    mesh.scale.set(1, Math.max(0.001, length), 1);
    mesh.quaternion.setFromUnitVectors(up, direction.normalize());
  };

  useFrame((_, delta) => {
    if (swinging) state.current = stepPendulum(state.current, delta / SLOW, config);
    const caught = state.current.side === 'peg';
    if (swinging && caught && !onPeg.current) playSound('knock', { volume: 0.3 });
    onPeg.current = caught;
    const position = toScene(bobPosition(state.current, config));
    bob.current?.position.set(...position);
    const pegPoint: [number, number, number] = [PIVOT[0], PIVOT[1] - PEG_DEPTH * METER, PIVOT[2]];
    if (state.current.side === 'peg') {
      stretch(upper.current, PIVOT, pegPoint);
      stretch(lower.current, pegPoint, position);
    } else {
      stretch(upper.current, PIVOT, position);
      if (lower.current) lower.current.visible = false;
    }
    if (pegMesh.current) {
      pegMesh.current.position.z = THREE.MathUtils.damp(
        pegMesh.current.position.z,
        peg ? 0 : -0.05,
        8,
        delta,
      );
    }
    if (swinging) trail.push(position[0], position[1], position[2] + 0.001);
  });

  const restart = () => {
    state.current = releasedAt(START);
    trail.clear();
  };
  const release = () => {
    if (!allow()) return;
    restart();
    setSwinging(true);
    playSound('whoosh', { volume: 0.6 });
  };
  const togglePeg = () => {
    if (!allow()) return;
    restart();
    setSwinging(false);
    setPeg((value) => !value);
  };

  const startY = PIVOT[1] - LENGTH * Math.cos(START) * METER;
  return (
    <group>
      {/* 받침판과 틀 */}
      <PopUp at={0}>
        <mesh
          position={[-0.02, 0.016, PIVOT[2]]}
          material={inkMaterial(TINT.wood)}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.64, 0.032, 0.2]} />
          <InkLines />
        </mesh>
      </PopUp>
      <PopUp at={0.08} span={0.3}>
        {[-0.28, 0.28].map((x) => (
          <mesh
            key={x}
            position={[x, (0.032 + PIVOT[1] + 0.03) / 2, PIVOT[2] - 0.05]}
            material={inkMaterial(TINT.woodDark)}
            castShadow
          >
            <boxGeometry args={[0.022, PIVOT[1] + 0.03 - 0.032, 0.022]} />
            <InkLines />
          </mesh>
        ))}
        <mesh
          position={[0, PIVOT[1] + 0.03, PIVOT[2] - 0.05]}
          material={inkMaterial(TINT.woodDark)}
          castShadow
        >
          <boxGeometry args={[0.6, 0.024, 0.03]} />
          <InkLines />
        </mesh>
        <mesh position={[0, PIVOT[1] + 0.008, PIVOT[2] - 0.025]} material={inkMaterial(TINT.steel)}>
          <boxGeometry args={[0.014, 0.03, 0.05]} />
          <InkLines width={1} />
        </mesh>
        {/* 못을 받치는 막대 (진자가 흔들리는 면 뒤쪽) */}
        <mesh
          position={[0, PIVOT[1] - (PEG_DEPTH * METER) / 2, PIVOT[2] - 0.045]}
          material={inkMaterial(TINT.woodDark)}
        >
          <boxGeometry args={[0.014, PEG_DEPTH * METER + 0.03, 0.012]} />
          <InkLines width={1} />
        </mesh>
      </PopUp>

      {/* 못: 꽂으면 앞으로 나온다 */}
      <PopUp
        at={0.2}
        mode="grow"
        span={0.18}
        position={[PIVOT[0], PIVOT[1] - PEG_DEPTH * METER, PIVOT[2]]}
      >
        <group ref={pegMesh} position={[0, 0, -0.05]}>
          <mesh rotation-x={Math.PI / 2} material={inkMaterial(TINT.red)} castShadow>
            <cylinderGeometry args={[0.006, 0.006, 0.05, 12]} />
            <InkLines edges={false} width={1} />
          </mesh>
        </group>
      </PopUp>

      {/* 처음 높이 */}
      <PopUp at={0.3}>
        <Line
          points={[
            [-0.27, startY, PIVOT[2] + 0.002],
            [0.27, startY, PIVOT[2] + 0.002],
          ]}
          color={TINT.accent}
          lineWidth={1.8}
          dashed
          dashSize={0.012}
          gapSize={0.008}
        />
      </PopUp>
      <PopUp at={0.55} mode="grow" span={0.16} position={[0.2, startY + 0.03, PIVOT[2]]}>
        <Label text="처음 높이" height={0.032} color={TINT.accent} />
      </PopUp>

      {/* 줄과 추 */}
      <PopUp at={0.34} span={0.26}>
        <mesh ref={upper} material={inkMaterial(TINT.ink)}>
          <cylinderGeometry args={[0.0016, 0.0016, 1, 6]} />
        </mesh>
        <mesh ref={lower} material={inkMaterial(TINT.ink)} visible={false}>
          <cylinderGeometry args={[0.0016, 0.0016, 1, 6]} />
        </mesh>
        <mesh ref={bob} material={inkMaterial(TINT.brass)} castShadow>
          <sphereGeometry args={[BOB, 28, 18]} />
          <InkLines edges={false} />
        </mesh>
      </PopUp>
      <primitive object={trail.line} />

      <Bars
        position={[0.4, 0, PIVOT[2]]}
        bars={[
          { label: '위치', color: ENERGY_COLORS.potential },
          { label: '운동', color: ENERGY_COLORS.kinetic },
          { label: '합', color: ENERGY_COLORS.total },
        ]}
        getValues={() => {
          const { potential, kinetic } = energiesOf(state.current, config);
          return [potential, kinetic, potential + kinetic];
        }}
        max={START_ENERGY * 1.05}
        height={0.3}
        at={0.42}
      />

      <SceneButton
        id="release"
        label={swinging ? '다시 놓기' : '놓기'}
        position={[-0.2, 0, 0.34]}
        onPress={release}
      />
      <SceneButton
        id="peg"
        label={peg ? '못 빼기' : '못 꽂기'}
        position={[0.02, 0, 0.34]}
        active={peg}
        onPress={togglePeg}
        at={0.84}
      />
    </group>
  );
}

/** 추가 지나간 자리를 그리는 선. 가장 최근 size개의 점만 남긴다. */
function createTrail(size: number, color: string) {
  const points = new Float32Array(size * 3);
  const attribute = new THREE.BufferAttribute(points, 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', attribute);
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 });
  const line = new THREE.Line(geometry, material);
  let count = 0;
  return {
    line,
    push(x: number, y: number, z: number) {
      points.copyWithin(3, 0, (size - 1) * 3);
      attribute.setXYZ(0, x, y, z);
      attribute.needsUpdate = true;
      count = Math.min(size, count + 1);
      geometry.setDrawRange(0, count);
    },
    clear() {
      count = 0;
      geometry.setDrawRange(0, 0);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
