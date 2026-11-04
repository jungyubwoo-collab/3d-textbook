import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type * as THREE from 'three';
import { InkLines } from '../../../ink/Ink.tsx';
import { inkMaterial } from '../../../ink/inkMaterial.ts';
import { playSound } from '../../../lib/sound.ts';
import { useLessonGate } from '../../../scene/gate.ts';
import { Label } from '../../../scene/Label.tsx';
import { TINT } from '../../../scene/palette.ts';
import { PopUp } from '../../../scene/PopUp.tsx';
import { PushArrow } from '../../../scene/PushArrow.tsx';
import { SceneButton } from '../../../scene/SceneButton.tsx';
import { collide, momentum, type CollisionKind } from './physics.ts';
import { MOMENTUM_QUESTION } from './ids.ts';

const Z = -0.03;
const TRACK_TOP = 0.022;
const WIDTH = 0.085;
const STOP = 0.43 - WIDTH / 2;
const A = { start: -0.3, mass: 1, speed: 1 };
const B_START = 0.04;
/** 1 m/s가 화면에서 초당 몇 단위인지 */
const SPEED_SCALE = 0.2;
/** 운동량 1 kg·m/s가 화살표 몇 단위인지 */
const ARROW_SCALE = 0.12;

interface Motion {
  a: number;
  b: number;
  va: number;
  vb: number;
  collided: boolean;
}

const initialMotion = (): Motion => ({ a: A.start, b: B_START, va: 0, vb: 0, collided: false });

/** 일직선 레일 위 두 수레의 충돌. 어떻게 부딪혀도 운동량의 합은 그대로다. */
export function MomentumScene() {
  const { allow } = useLessonGate(MOMENTUM_QUESTION);
  const [kind, setKind] = useState<CollisionKind>('stick');
  const [massB, setMassB] = useState<1 | 2>(1);
  const [phase, setPhase] = useState<'ready' | 'run' | 'done'>('ready');
  const [after, setAfter] = useState<[number, number] | null>(null);
  const motion = useRef<Motion>(initialMotion());
  const elapsed = useRef(0);
  const cartA = useRef<THREE.Group>(null);
  const cartB = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const m = motion.current;
    if (phase === 'run') {
      elapsed.current += delta;
      const step = delta * SPEED_SCALE;
      m.a += m.va * step;
      m.b += m.vb * step;
      if (!m.collided && m.a + WIDTH >= m.b) {
        const [va, vb] = collide(A.mass, m.va, massB, m.vb, kind);
        m.va = va;
        m.vb = vb;
        m.collided = true;
        m.a = m.b - WIDTH;
        setAfter([va, vb]);
        playSound('knock', { volume: kind === 'stick' ? 0.8 : 1 });
      }
      if (m.b >= STOP) {
        m.b = STOP;
        m.vb = 0;
        if (kind === 'stick') m.va = 0;
      }
      if (kind === 'stick' && m.collided) m.a = m.b - WIDTH;
      if (m.a <= -STOP) {
        m.a = -STOP;
        m.va = 0;
      }
      if ((m.collided && m.va === 0 && m.vb === 0) || elapsed.current > 9) setPhase('done');
    }
    if (cartA.current) cartA.current.position.x = m.a;
    if (cartB.current) cartB.current.position.x = m.b;
  });

  const reset = () => {
    motion.current = initialMotion();
    elapsed.current = 0;
    setAfter(null);
    setPhase('ready');
  };
  const start = () => {
    if (!allow()) return;
    reset();
    motion.current.va = A.speed;
    setPhase('run');
    playSound('whoosh', { volume: 0.8 });
  };
  const pickKind = (value: CollisionKind) => () => {
    if (!allow()) return;
    reset();
    setKind(value);
  };
  const pickMass = (value: 1 | 2) => () => {
    if (!allow()) return;
    reset();
    setMassB(value);
  };

  const before = momentum(A.mass, A.speed);
  const total = after ? momentum(A.mass, after[0]) + momentum(massB, after[1]) : null;

  return (
    <group>
      {/* 레일과 양 끝 멈춤판 */}
      <PopUp at={0}>
        <mesh
          position={[0, TRACK_TOP / 2, Z]}
          material={inkMaterial(TINT.wood)}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.92, TRACK_TOP, 0.13]} />
          <InkLines />
        </mesh>
        {[-0.445, 0.445].map((x) => (
          <mesh
            key={x}
            position={[x, TRACK_TOP + 0.03, Z]}
            material={inkMaterial(TINT.woodDark)}
            castShadow
          >
            <boxGeometry args={[0.012, 0.06, 0.13]} />
            <InkLines />
          </mesh>
        ))}
      </PopUp>

      {/* 수레 A (움직이는 쪽) */}
      <PopUp at={0.18} span={0.26}>
        <group ref={cartA} position={[A.start, 0, Z]}>
          <Cart color={TINT.orange} />
          {kind === 'stick' ? (
            <mesh
              position={[WIDTH / 2 + 0.003, TRACK_TOP + 0.04, 0]}
              material={inkMaterial(TINT.ink)}
            >
              <boxGeometry args={[0.006, 0.03, 0.05]} />
            </mesh>
          ) : (
            Array.from({ length: 4 }, (_, i) => (
              <mesh
                key={i}
                position={[WIDTH / 2 + 0.002 + i * 0.004, TRACK_TOP + 0.04, 0]}
                rotation-y={Math.PI / 2}
              >
                <torusGeometry args={[0.011, 0.0018, 6, 16]} />
                <meshBasicMaterial color={TINT.ink} />
              </mesh>
            ))
          )}
        </group>
      </PopUp>

      {/* 수레 B (멈춰 있는 쪽). 2 kg이면 추를 하나 더 싣는다. */}
      <PopUp at={0.26} span={0.26}>
        <group ref={cartB} position={[B_START, 0, Z]}>
          <Cart color={TINT.blue} />
          {kind === 'stick' && (
            <mesh
              position={[-WIDTH / 2 - 0.003, TRACK_TOP + 0.04, 0]}
              material={inkMaterial(TINT.ink)}
            >
              <boxGeometry args={[0.006, 0.03, 0.05]} />
            </mesh>
          )}
          {massB === 2 && (
            <mesh
              position={[0, TRACK_TOP + 0.075, 0]}
              material={inkMaterial(TINT.steel)}
              castShadow
            >
              <boxGeometry args={[0.05, 0.03, 0.05]} />
              <InkLines />
            </mesh>
          )}
        </group>
      </PopUp>

      <PushArrow
        getValue={() => momentum(A.mass, motion.current.va)}
        scale={ARROW_SCALE}
        getOrigin={() => [motion.current.a, TRACK_TOP + 0.13, Z]}
        color={TINT.orange}
      />
      <PushArrow
        getValue={() => momentum(massB, motion.current.vb)}
        scale={ARROW_SCALE}
        getOrigin={() => [motion.current.b, TRACK_TOP + 0.13 + (massB === 2 ? 0.02 : 0), Z]}
        color={TINT.blue}
      />

      <PopUp at={0.5} mode="grow" span={0.16} position={[A.start, TRACK_TOP + 0.1, Z + 0.05]}>
        <Label text="A 1 kg" height={0.03} />
      </PopUp>
      <PopUp at={0.54} mode="grow" span={0.16} position={[B_START, TRACK_TOP + 0.1, Z + 0.05]}>
        <Label text={`B ${massB} kg`} height={0.03} />
      </PopUp>
      <PopUp at={0.62} mode="grow" span={0.18} position={[0, 0.3, Z]}>
        <Label
          text={
            total === null
              ? `충돌 전 운동량 합 ${before.toFixed(1)} kg·m/s`
              : `충돌 전 ${before.toFixed(1)} → 충돌 후 ${total.toFixed(1)} kg·m/s`
          }
          height={0.042}
          color={total === null ? TINT.ink : TINT.accent}
        />
      </PopUp>
      {after && (
        <Label
          text={`A ${after[0].toFixed(2)} m/s · B ${after[1].toFixed(2)} m/s`}
          height={0.032}
          position={[0, 0.25, Z]}
        />
      )}

      <SceneButton
        id="start"
        label={phase === 'ready' ? '출발' : '다시'}
        position={[-0.38, 0, 0.34]}
        onPress={
          phase === 'ready'
            ? start
            : () => {
                if (allow()) reset();
              }
        }
        width={0.15}
      />
      <SceneButton
        id="stick"
        label="붙는 충돌"
        position={[-0.19, 0, 0.34]}
        active={kind === 'stick'}
        onPress={pickKind('stick')}
        width={0.15}
        at={0.8}
      />
      <SceneButton
        id="bounce"
        label="튕기는 충돌"
        position={[0, 0, 0.34]}
        active={kind === 'bounce'}
        onPress={pickKind('bounce')}
        width={0.15}
        at={0.83}
      />
      <SceneButton
        id="mass-1"
        label="B 1 kg"
        position={[0.19, 0, 0.34]}
        active={massB === 1}
        onPress={pickMass(1)}
        width={0.15}
        at={0.86}
      />
      <SceneButton
        id="mass-2"
        label="B 2 kg"
        position={[0.38, 0, 0.34]}
        active={massB === 2}
        onPress={pickMass(2)}
        width={0.15}
        at={0.89}
      />
    </group>
  );
}

function Cart({ color }: { color: string }) {
  return (
    <>
      <mesh
        position={[0, TRACK_TOP + 0.036, 0]}
        material={inkMaterial(color)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[WIDTH, 0.034, 0.072]} />
        <InkLines />
      </mesh>
      {[-0.026, 0.026].flatMap((x) =>
        [-0.04, 0.04].map((dz) => (
          <mesh
            key={`${x}${dz}`}
            position={[x, TRACK_TOP + 0.012, dz]}
            rotation-x={Math.PI / 2}
            material={inkMaterial(TINT.steel)}
          >
            <cylinderGeometry args={[0.012, 0.012, 0.008, 18]} />
            <InkLines width={1} />
          </mesh>
        )),
      )}
    </>
  );
}
