import { useCursor } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { COLORS } from '../../../book/constants.ts';
import { isSceneInteractive, useSceneRuntime } from '../../../book/runtime.ts';
import { InkLines } from '../../../ink/Ink.tsx';
import { inkMaterial } from '../../../ink/inkMaterial.ts';
import { Label } from '../../../scene/Label.tsx';
import { answerKey, bookStore, useBookStore } from '../../../state/bookStore.ts';
import { LEVER_QUESTION_ID } from './ids.ts';
import { netTorque, rightSide, tiltAngle, type Hanging } from './physics.ts';

/** 장면 크기 (페이지 가로 = 1) */
const UNIT = 0.1;
const PIVOT_Y = 0.3;
const BEAM = { length: 0.94, height: 0.03, depth: 0.06 };
const RING = { radius: 0.012, tube: 0.0028 };
const STRING_LENGTH = 0.045;
const WEIGHT = { radius: 0.022, height: 0.032, gap: 0.004 };
const MAX_PER_HOOK = 4;
const FIXED: Hanging = { position: -2, count: 2 };
const HOOKS = [-4, -3, -2, -1, 1, 2, 3, 4];
const TINT = {
  stand: '#e9dcc3',
  beam: '#f6f0e3',
  hook: '#cbbfa6',
  fixed: '#7d9cc4',
  added: '#e07b45',
};

function createFulcrumGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.085, 0);
  shape.lineTo(0.085, 0);
  shape.lineTo(0, PIVOT_Y - 0.014);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
  geometry.translate(0, 0, -0.05);
  return geometry;
}

/** 고리 아래 끝(막대 좌표)을 장면 좌표로 바꾼다. */
function hookPoint(position: number, angle: number, target: THREE.Vector3): THREE.Vector3 {
  const x = position * UNIT;
  const y = -RING.radius * 2;
  return target.set(
    x * Math.cos(angle) - y * Math.sin(angle),
    PIVOT_Y + x * Math.sin(angle) + y * Math.cos(angle),
    0,
  );
}

/**
 * 지레 실험대. 왼쪽 2칸에 추 2개가 고정되어 있고, 오른쪽 고리에 추를 걸어 수평을 맞춘다.
 * 왼쪽 페이지에서 예측을 고르기 전에는 잠겨 있다.
 */
export function LeverScene() {
  const scene = useSceneRuntime();
  const answered = useBookStore((state) =>
    Boolean(state.answers[answerKey(scene.lessonId, LEVER_QUESTION_ID)]),
  );
  const [counts, setCounts] = useState<readonly number[]>([0, 0, 0, 0]);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const torque = netTorque([FIXED, ...rightSide(counts)]);
  const balanced = torque === 0 && counts.some((count) => count > 0);
  const fulcrum = useMemo(() => createFulcrumGeometry(), []);
  useEffect(() => () => fulcrum.dispose(), [fulcrum]);

  const beam = useRef<THREE.Group>(null);
  const angle = useRef(tiltAngle(netTorque([FIXED])));
  const velocity = useRef(0);
  const hangers = useRef(new Map<number, THREE.Group>());
  const hints = useRef<THREE.Group>(null);
  const balanceLabel = useRef<THREE.Group>(null);
  const point = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }, delta) => {
    // 살짝 출렁이다 멈추는 용수철 운동
    const dt = Math.min(delta, 1 / 30);
    const acceleration = 60 * (tiltAngle(torque) - angle.current) - 7 * velocity.current;
    velocity.current += acceleration * dt;
    angle.current += velocity.current * dt;
    if (beam.current) beam.current.rotation.z = angle.current;
    // 추는 막대가 기울어도 늘 수직으로 매달린다.
    for (const [position, group] of hangers.current) {
      group.position.copy(hookPoint(position, angle.current, point));
    }
    if (hints.current) {
      hints.current.visible = answered && counts.every((count) => count === 0);
      const pulse = 1 + 0.25 * Math.sin(clock.elapsedTime * 5);
      for (const ring of hints.current.children) ring.scale.setScalar(pulse);
    }
    if (balanceLabel.current) {
      const scale = THREE.MathUtils.damp(
        balanceLabel.current.scale.x,
        balanced ? 1 : 0.001,
        10,
        delta,
      );
      balanceLabel.current.scale.setScalar(scale);
      balanceLabel.current.visible = scale > 0.01;
    }
  });

  /** 조작 전 확인: 장면이 다 일어섰고, 예측을 골랐는지 */
  const act = (action: () => void) => (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    if (!isSceneInteractive(scene)) return;
    if (!answered) {
      bookStore.getState().showToast('먼저 왼쪽 페이지에서 예측을 골라 보세요.');
      return;
    }
    action();
  };
  const hover = {
    onPointerOver: (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setHovered(true);
    },
    onPointerOut: () => setHovered(false),
  };

  const addWeight = (position: number) => {
    if ((counts[position - 1] ?? 0) >= MAX_PER_HOOK) {
      bookStore.getState().showToast(`한 고리에는 추를 ${MAX_PER_HOOK}개까지 걸 수 있어요.`);
      return;
    }
    setCounts((current) =>
      current.map((count, index) => (index === position - 1 ? count + 1 : count)),
    );
  };
  const removeWeight = (position: number) =>
    setCounts((current) =>
      current.map((count, index) => (index === position - 1 ? Math.max(0, count - 1) : count)),
    );

  const hanging: Hanging[] = [FIXED, ...rightSide(counts).filter((item) => item.count > 0)];

  return (
    <group>
      {/* 받침대와 받침점 */}
      <mesh position={[0, 0.007, 0]} material={inkMaterial(TINT.stand)} castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.014, 0.16]} />
        <InkLines />
      </mesh>
      <mesh
        geometry={fulcrum}
        position={[0, 0.014, 0]}
        material={inkMaterial(TINT.stand)}
        castShadow
        receiveShadow
      >
        <InkLines />
      </mesh>

      {/* 받침점을 축으로 기우는 막대 */}
      <group ref={beam} position={[0, PIVOT_Y, 0]}>
        <mesh
          position={[0, BEAM.height / 2, 0]}
          material={inkMaterial(TINT.beam)}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[BEAM.length, BEAM.height, BEAM.depth]} />
          <InkLines />
        </mesh>
        {HOOKS.map((position) => (
          <group key={position} position={[position * UNIT, 0, 0]}>
            {/* 눈금 */}
            <mesh position={[0, BEAM.height / 2, BEAM.depth / 2 + 0.001]}>
              <boxGeometry args={[0.0035, BEAM.height * 0.55, 0.002]} />
              <meshBasicMaterial color={COLORS.ink} />
            </mesh>
            <mesh position={[0, -RING.radius, 0]} material={inkMaterial(TINT.hook)} castShadow>
              <torusGeometry args={[RING.radius, RING.tube, 8, 20]} />
              <InkLines edges={false} width={1} />
            </mesh>
            {position > 0 && (
              <mesh
                position={[0, -RING.radius, 0]}
                {...hover}
                onClick={act(() => addWeight(position))}
              >
                <sphereGeometry args={[0.04, 12, 8]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
            )}
          </group>
        ))}
        {/* 예측을 고른 뒤 눌러 볼 고리를 알려 준다. */}
        <group ref={hints} visible={false}>
          {[1, 2, 3, 4].map((position) => (
            <mesh key={position} position={[position * UNIT, -RING.radius, 0]}>
              <torusGeometry args={[RING.radius * 1.9, 0.0025, 8, 28]} />
              <meshBasicMaterial
                color={COLORS.accent}
                transparent
                opacity={0.85}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      </group>

      {/* 매달린 추 */}
      {hanging.map(({ position, count }) => {
        const fixed = position < 0;
        return (
          <group
            key={position}
            ref={(group) => {
              if (!group) {
                hangers.current.delete(position);
                return;
              }
              group.position.copy(hookPoint(position, angle.current, point));
              hangers.current.set(position, group);
            }}
          >
            <mesh position={[0, -STRING_LENGTH / 2, 0]}>
              <cylinderGeometry args={[0.0012, 0.0012, STRING_LENGTH, 6]} />
              <meshBasicMaterial color={COLORS.ink} />
            </mesh>
            {Array.from({ length: count }, (_, k) => (
              <mesh
                key={k}
                position={[
                  0,
                  -STRING_LENGTH - WEIGHT.height / 2 - k * (WEIGHT.height + WEIGHT.gap),
                  0,
                ]}
                material={inkMaterial(fixed ? TINT.fixed : TINT.added)}
                castShadow
                receiveShadow
                {...(fixed ? {} : { ...hover, onClick: act(() => removeWeight(position)) })}
              >
                <cylinderGeometry args={[WEIGHT.radius, WEIGHT.radius, WEIGHT.height, 24]} />
                <InkLines />
              </mesh>
            ))}
          </group>
        );
      })}

      <group ref={balanceLabel} position={[0, PIVOT_Y + 0.13, 0]} visible={false}>
        <Label text="수평!" height={0.065} color={COLORS.accent} />
      </group>
    </group>
  );
}
