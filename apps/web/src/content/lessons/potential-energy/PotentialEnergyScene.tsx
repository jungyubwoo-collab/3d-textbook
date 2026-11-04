import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import { InkLines } from '../../../ink/Ink.tsx';
import { inkMaterial } from '../../../ink/inkMaterial.ts';
import { Bars } from '../../../scene/Bars.tsx';
import { useLessonGate } from '../../../scene/gate.ts';
import { Label } from '../../../scene/Label.tsx';
import { ENERGY_COLORS, TINT } from '../../../scene/palette.ts';
import { PopUp } from '../../../scene/PopUp.tsx';
import { SceneButton } from '../../../scene/SceneButton.tsx';
import { HEIGHTS, potentialEnergy } from './physics.ts';
import { POTENTIAL_QUESTION } from './ids.ts';

const FLOOR = 0.032;
/** 1 m가 장면에서 몇 단위인지 */
const METER = 0.1;
const HOOK_X = -0.13;
const Z = -0.06;
const PULLEY = { x: HOOK_X + 0.03, y: 0.5, radius: 0.03 };
const DRUM = { x: PULLEY.x + PULLEY.radius + 0.004, y: 0.085, radius: 0.02 };
const MAX_ENERGY = potentialEnergy(2, 3) * 1.02;

/** 도르래로 상자를 들어 올리는 실험대. 높이와 질량을 바꾸면 위치 에너지가 바뀐다. */
export function PotentialEnergyScene() {
  const { allow } = useLessonGate(POTENTIAL_QUESTION);
  const [level, setLevel] = useState(1);
  const [mass, setMass] = useState<1 | 2>(1);
  const height = useRef(1);
  const box = useRef<THREE.Group>(null);
  const ropeLeft = useRef<THREE.Mesh>(null);
  const crank = useRef<THREE.Group>(null);
  const marker = useRef<THREE.Group>(null);
  const size = mass === 1 ? 0.06 : 0.076;

  useFrame((_, delta) => {
    height.current = THREE.MathUtils.damp(height.current, level, 4, delta);
    const bottom = FLOOR + height.current * METER;
    if (box.current) box.current.position.y = bottom;
    if (marker.current) marker.current.position.y = bottom;
    if (ropeLeft.current) {
      const from = bottom + size;
      const to = PULLEY.y;
      ropeLeft.current.scale.y = Math.max(0.001, to - from);
      ropeLeft.current.position.y = (from + to) / 2;
    }
    if (crank.current) crank.current.rotation.z = -height.current * 2.4;
  });

  const energy = potentialEnergy(mass, HEIGHTS[level] ?? 0);
  const raise = () => {
    if (allow()) setLevel((value) => Math.min(HEIGHTS.length - 1, value + 1));
  };
  const lower = () => {
    if (allow()) setLevel((value) => Math.max(0, value - 1));
  };
  const pickMass = (value: 1 | 2) => () => {
    if (allow()) setMass(value);
  };

  return (
    <group>
      {/* 바닥판, 기둥, 들보 */}
      <PopUp at={0}>
        <mesh
          position={[-0.05, FLOOR / 2, Z]}
          material={inkMaterial(TINT.wood)}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.5, FLOOR, 0.24]} />
          <InkLines />
        </mesh>
      </PopUp>
      <PopUp at={0.08} span={0.3}>
        {[-0.235, -0.005].map((x) => (
          <mesh
            key={x}
            position={[x, (FLOOR + PULLEY.y + 0.04) / 2, Z - 0.05]}
            material={inkMaterial(TINT.woodDark)}
            castShadow
          >
            <boxGeometry args={[0.022, PULLEY.y + 0.04 - FLOOR, 0.022]} />
            <InkLines />
          </mesh>
        ))}
        <mesh
          position={[-0.12, PULLEY.y + 0.05, Z - 0.05]}
          material={inkMaterial(TINT.woodDark)}
          castShadow
        >
          <boxGeometry args={[0.26, 0.022, 0.03]} />
          <InkLines />
        </mesh>
      </PopUp>

      {/* 눈금자: 1 m마다 */}
      <PopUp at={0.16}>
        <mesh position={[-0.29, FLOOR + 0.2, Z]} material={inkMaterial(TINT.card)} castShadow>
          <boxGeometry args={[0.03, 0.4, 0.012]} />
          <InkLines />
        </mesh>
        {HEIGHTS.map((h) => (
          <mesh key={h} position={[-0.28, FLOOR + h * METER, Z + 0.007]}>
            <boxGeometry args={[0.03, 0.003, 0.001]} />
            <meshBasicMaterial color={TINT.ink} />
          </mesh>
        ))}
      </PopUp>
      {HEIGHTS.map((h) => (
        <PopUp key={h} at={0.5} mode="grow" span={0.15} position={[-0.345, FLOOR + h * METER, Z]}>
          <Label text={`${h} m`} height={0.032} />
        </PopUp>
      ))}

      {/* 도르래와 감개 */}
      <PopUp at={0.22} mode="grow" span={0.2} position={[PULLEY.x, PULLEY.y, Z]}>
        <mesh rotation-x={Math.PI / 2} material={inkMaterial(TINT.metal)} castShadow>
          <cylinderGeometry args={[PULLEY.radius, PULLEY.radius, 0.016, 32]} />
          <InkLines />
        </mesh>
        <mesh position={[0, 0.03, -0.02]} material={inkMaterial(TINT.steel)}>
          <boxGeometry args={[0.012, 0.05, 0.012]} />
        </mesh>
      </PopUp>
      <PopUp at={0.26} mode="grow" span={0.2} position={[DRUM.x, DRUM.y, Z]}>
        <mesh rotation-x={Math.PI / 2} material={inkMaterial(TINT.brass)} castShadow>
          <cylinderGeometry args={[DRUM.radius, DRUM.radius, 0.05, 28]} />
          <InkLines />
        </mesh>
        <group ref={crank} position={[0, 0, 0.032]}>
          <mesh position={[0.022, 0, 0]} material={inkMaterial(TINT.steel)}>
            <boxGeometry args={[0.044, 0.008, 0.006]} />
            <InkLines edges={false} width={1} />
          </mesh>
          <mesh
            position={[0.044, 0, 0.012]}
            rotation-x={Math.PI / 2}
            material={inkMaterial(TINT.red)}
          >
            <cylinderGeometry args={[0.006, 0.006, 0.022, 10]} />
          </mesh>
        </group>
      </PopUp>

      {/* 줄: 상자 → 도르래 → 감개 */}
      <PopUp at={0.32}>
        <mesh ref={ropeLeft} position={[HOOK_X, 0.3, Z]} material={inkMaterial(TINT.ink)}>
          <cylinderGeometry args={[0.0018, 0.0018, 1, 6]} />
        </mesh>
        <mesh
          position={[PULLEY.x + PULLEY.radius, (PULLEY.y + DRUM.y + DRUM.radius) / 2, Z]}
          material={inkMaterial(TINT.ink)}
        >
          <cylinderGeometry args={[0.0018, 0.0018, PULLEY.y - DRUM.y - DRUM.radius, 6]} />
        </mesh>
      </PopUp>

      {/* 상자와 높이 표시선 */}
      <PopUp at={0.38} span={0.22}>
        <group ref={box} position={[HOOK_X, FLOOR + METER, Z]}>
          <mesh
            position={[0, size / 2, 0]}
            material={inkMaterial(mass === 1 ? TINT.orange : TINT.red)}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[size, size, size]} />
            <InkLines />
          </mesh>
        </group>
        <group ref={marker} position={[0, FLOOR + METER, Z + 0.04]}>
          <Line
            points={[
              [-0.28, 0, 0],
              [HOOK_X - size / 2, 0, 0],
            ]}
            color={TINT.accent}
            lineWidth={1.6}
            dashed
            dashSize={0.008}
            gapSize={0.006}
          />
        </group>
      </PopUp>

      <Bars
        position={[0.27, 0, Z]}
        bars={[{ label: '위치 에너지', color: ENERGY_COLORS.potential }]}
        getValues={() => [potentialEnergy(mass, height.current)]}
        max={MAX_ENERGY}
        height={0.36}
        at={0.42}
      />
      <PopUp at={0.62} mode="grow" span={0.18} position={[0.05, 0.6, Z]}>
        <Label
          text={`${mass} kg × 9.8 × ${HEIGHTS[level]} m = ${energy.toFixed(1)} J`}
          height={0.042}
          color={TINT.ink}
        />
      </PopUp>

      <SceneButton
        id="raise"
        label="▲ 올리기"
        position={[-0.3, 0, 0.34]}
        onPress={raise}
        disabled={level === HEIGHTS.length - 1}
      />
      <SceneButton
        id="lower"
        label="▼ 내리기"
        position={[-0.11, 0, 0.34]}
        onPress={lower}
        disabled={level === 0}
        at={0.8}
      />
      <SceneButton
        id="mass-1"
        label="1 kg"
        position={[0.12, 0, 0.34]}
        active={mass === 1}
        onPress={pickMass(1)}
        at={0.84}
      />
      <SceneButton
        id="mass-2"
        label="2 kg"
        position={[0.31, 0, 0.34]}
        active={mass === 2}
        onPress={pickMass(2)}
        at={0.88}
      />
    </group>
  );
}
