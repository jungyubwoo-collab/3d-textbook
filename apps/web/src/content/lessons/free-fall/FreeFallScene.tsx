import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { InkLines } from '../../../ink/Ink.tsx';
import { glassMaterial, inkMaterial } from '../../../ink/inkMaterial.ts';
import { useLessonGate } from '../../../scene/gate.ts';
import { Label } from '../../../scene/Label.tsx';
import { TINT } from '../../../scene/palette.ts';
import { PopUp } from '../../../scene/PopUp.tsx';
import { SceneButton } from '../../../scene/SceneButton.tsx';
import {
  BALL_TERMINAL_SPEED,
  FEATHER_TERMINAL_SPEED,
  TUBE_LENGTH,
  fallDistance,
  timeToFall,
} from './physics.ts';
import { FREE_FALL_QUESTION } from './ids.ts';

const TUBE = { x: -0.08, z: -0.08, radius: 0.064, bottom: 0.04, top: 0.56 };
const START_Y = TUBE.top - 0.055;
const FLOOR_Y = TUBE.bottom + 0.022;
/** 1 m가 장면에서 몇 단위인지 */
const METER = (START_Y - FLOOR_Y) / TUBE_LENGTH;
/** 느린 화면: 실제 시간의 몇 배로 보여 줄지 */
const SLOW = 2.4;
/** 연속 사진(스트로보)을 찍는 간격(실제 초) */
const STROBE = 0.06;
const BALL_RADIUS = 0.017;

function createFeatherGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const length = 0.06;
  const half = 0.013;
  shape.moveTo(0, -length / 2);
  shape.bezierCurveTo(half * 1.3, -length * 0.3, half, length * 0.35, 0, length / 2);
  shape.bezierCurveTo(-half * 0.8, length * 0.3, -half * 1.2, -length * 0.25, 0, -length / 2);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.0025, bevelEnabled: false });
  geometry.translate(0, 0, -0.00125);
  return geometry;
}

interface Snapshot {
  ball: number;
  feather: number;
  featherX: number;
}

/** 유리관 속 깃털과 쇠구슬. 공기를 빼면 둘이 나란히 떨어진다. */
export function FreeFallScene() {
  const { allow } = useLessonGate(FREE_FALL_QUESTION);
  const [air, setAir] = useState(true);
  const [phase, setPhase] = useState<'ready' | 'falling' | 'landed'>('ready');
  const [ghosts, setGhosts] = useState<Snapshot[]>([]);
  const feather = useMemo(() => createFeatherGeometry(), []);
  useEffect(() => () => feather.dispose(), [feather]);

  const time = useRef(0);
  const nextStrobe = useRef(0);
  const ball = useRef<THREE.Group>(null);
  const plume = useRef<THREE.Group>(null);
  const needle = useRef<THREE.Group>(null);

  const ballDrag = air ? BALL_TERMINAL_SPEED : undefined;
  const featherDrag = air ? FEATHER_TERMINAL_SPEED : undefined;
  const duration = Math.max(
    timeToFall(TUBE_LENGTH, ballDrag),
    timeToFall(TUBE_LENGTH, featherDrag),
  );

  const positions = (t: number): Snapshot => {
    const ballFall = Math.min(TUBE_LENGTH, fallDistance(t, ballDrag));
    const featherFall = Math.min(TUBE_LENGTH, fallDistance(t, featherDrag));
    const sway = air && featherFall < TUBE_LENGTH ? 0.014 * Math.sin(t * 7) : 0;
    return {
      ball: START_Y - ballFall * METER,
      feather: START_Y - featherFall * METER,
      featherX: sway,
    };
  };

  useFrame((_, delta) => {
    if (phase === 'falling') {
      time.current += delta / SLOW;
      while (time.current >= nextStrobe.current && nextStrobe.current <= duration) {
        const shot = positions(nextStrobe.current);
        setGhosts((current) => [...current, shot]);
        nextStrobe.current += STROBE;
      }
      if (time.current >= duration) setPhase('landed');
    }
    const now = positions(phase === 'ready' ? 0 : time.current);
    if (ball.current) ball.current.position.y = now.ball;
    if (plume.current) {
      plume.current.position.set(TUBE.x + 0.024 + now.featherX, now.feather, TUBE.z);
      const flutter = air && phase === 'falling' ? Math.sin(time.current * 7 + 1) * 0.5 : 0;
      plume.current.rotation.z = 0.25 + flutter;
    }
    if (needle.current) {
      needle.current.rotation.z = THREE.MathUtils.damp(
        needle.current.rotation.z,
        air ? 0.9 : -0.9,
        4,
        delta,
      );
    }
  });

  const drop = () => {
    if (!allow()) return;
    time.current = 0;
    nextStrobe.current = 0;
    setGhosts([]);
    setPhase('falling');
  };
  const toggleAir = () => {
    if (!allow()) return;
    setAir((value) => !value);
    time.current = 0;
    setGhosts([]);
    setPhase('ready');
  };

  return (
    <group>
      {/* 받침대 */}
      <PopUp at={0}>
        <mesh
          position={[TUBE.x + 0.07, 0.016, TUBE.z]}
          material={inkMaterial(TINT.wood)}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.4, 0.032, 0.22]} />
          <InkLines />
        </mesh>
      </PopUp>

      {/* 눈금자: 10 cm마다 눈금 */}
      <PopUp at={0.06}>
        <group position={[TUBE.x - 0.1, 0, TUBE.z]}>
          <mesh
            position={[0, (FLOOR_Y + START_Y) / 2 + 0.016, 0]}
            material={inkMaterial(TINT.card)}
            castShadow
          >
            <boxGeometry args={[0.03, START_Y - FLOOR_Y + 0.05, 0.012]} />
            <InkLines />
          </mesh>
          {Array.from({ length: 11 }, (_, i) => (
            <mesh key={i} position={[0.006, FLOOR_Y + i * 0.1 * METER, 0.0065]}>
              <boxGeometry args={[i % 5 === 0 ? 0.022 : 0.012, 0.0022, 0.001]} />
              <meshBasicMaterial color={TINT.ink} />
            </mesh>
          ))}
        </group>
      </PopUp>

      {/* 유리관과 마개 */}
      <PopUp at={0.12}>
        <mesh position={[TUBE.x, (TUBE.bottom + TUBE.top) / 2, TUBE.z]} material={glassMaterial}>
          <cylinderGeometry
            args={[TUBE.radius, TUBE.radius, TUBE.top - TUBE.bottom, 40, 1, true]}
          />
        </mesh>
        {/* 유리의 양옆 윤곽 (투명해서 윤곽선 껍질 대신 직접 긋는다) */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[TUBE.x + side * TUBE.radius, (TUBE.bottom + TUBE.top) / 2, TUBE.z]}
          >
            <boxGeometry args={[0.0028, TUBE.top - TUBE.bottom, 0.0028]} />
            <meshBasicMaterial color={TINT.ink} />
          </mesh>
        ))}
        {[TUBE.bottom, TUBE.top].map((y) => (
          <mesh
            key={y}
            position={[TUBE.x, y, TUBE.z]}
            material={inkMaterial(TINT.metal)}
            castShadow
          >
            <cylinderGeometry args={[TUBE.radius + 0.01, TUBE.radius + 0.01, 0.026, 40]} />
            <InkLines />
          </mesh>
        ))}
        {/* 유리의 반짝임 */}
        <mesh
          position={[
            TUBE.x - TUBE.radius * 0.55,
            (TUBE.bottom + TUBE.top) / 2,
            TUBE.z + TUBE.radius * 0.8,
          ]}
        >
          <boxGeometry args={[0.004, TUBE.top - TUBE.bottom - 0.06, 0.001]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
        </mesh>
      </PopUp>

      {/* 진공 펌프와 압력계 */}
      <PopUp at={0.22}>
        <group position={[TUBE.x + 0.17, 0, TUBE.z]}>
          <mesh position={[0, 0.07, 0]} material={inkMaterial(TINT.steel)} castShadow receiveShadow>
            <boxGeometry args={[0.08, 0.075, 0.08]} />
            <InkLines />
          </mesh>
          <mesh
            position={[0, 0.07, 0.042]}
            rotation-x={Math.PI / 2}
            material={inkMaterial(TINT.card)}
          >
            <cylinderGeometry args={[0.026, 0.026, 0.006, 32]} />
            <InkLines />
          </mesh>
          <group ref={needle} position={[0, 0.07, 0.047]}>
            <mesh position={[0, 0.011, 0]}>
              <boxGeometry args={[0.003, 0.022, 0.002]} />
              <meshBasicMaterial color={TINT.accent} />
            </mesh>
          </group>
          <mesh
            position={[-0.07, 0.05, 0]}
            rotation-z={Math.PI / 2}
            material={inkMaterial(TINT.ink)}
          >
            <cylinderGeometry args={[0.007, 0.007, 0.07, 12]} />
          </mesh>
        </group>
      </PopUp>

      {/* 떨어지는 물체: 페이지에서 떠올라 관 위쪽 제자리로 간다. */}
      <PopUp at={0.34} span={0.24}>
        <group ref={ball} position={[TUBE.x - 0.024, START_Y, TUBE.z]}>
          <mesh material={inkMaterial(TINT.steel)} castShadow>
            <sphereGeometry args={[BALL_RADIUS, 24, 16]} />
            <InkLines edges={false} />
          </mesh>
        </group>
        <group ref={plume} position={[TUBE.x + 0.024, START_Y, TUBE.z]}>
          <mesh geometry={feather} material={inkMaterial(TINT.card)} castShadow>
            <InkLines />
          </mesh>
        </group>
      </PopUp>

      {/* 연속 사진: 같은 시간 간격의 위치. 아래로 갈수록 간격이 벌어진다(빨라진다). */}
      {ghosts.map((shot, index) => (
        <group key={index}>
          <mesh position={[TUBE.x - 0.024, shot.ball, TUBE.z]}>
            <sphereGeometry args={[BALL_RADIUS, 16, 10]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.35} depthWrite={false} />
            <InkLines edges={false} width={0.8} />
          </mesh>
          <mesh
            geometry={feather}
            position={[TUBE.x + 0.024 + shot.featherX, shot.feather, TUBE.z]}
            rotation-z={0.25}
          >
            <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
            <InkLines outline={false} width={0.8} />
          </mesh>
        </group>
      ))}

      <PopUp at={0.55} mode="grow" span={0.18} position={[TUBE.x, TUBE.top + 0.07, TUBE.z]}>
        <Label
          text={air ? '공기 있음' : '진공'}
          height={0.05}
          color={air ? TINT.ink : TINT.accent}
        />
      </PopUp>

      <SceneButton
        id="drop"
        label={phase === 'ready' ? '놓기' : '다시 놓기'}
        position={[-0.14, 0, 0.34]}
        onPress={drop}
      />
      <SceneButton
        id="air"
        label={air ? '공기 빼기' : '공기 넣기'}
        position={[0.08, 0, 0.34]}
        active={!air}
        onPress={toggleAir}
        at={0.84}
      />
    </group>
  );
}
