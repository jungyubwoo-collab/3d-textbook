import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type * as THREE from 'three';
import { InkLines } from '../../../ink/Ink.tsx';
import { inkMaterial } from '../../../ink/inkMaterial.ts';
import { useLessonGate } from '../../../scene/gate.ts';
import { Label } from '../../../scene/Label.tsx';
import { TINT } from '../../../scene/palette.ts';
import { PopUp } from '../../../scene/PopUp.tsx';
import { SceneButton } from '../../../scene/SceneButton.tsx';
import { FRICTION, SPEEDS, kineticEnergy, slideDistance } from './physics.ts';
import { GRAVITY } from '../physics.ts';
import { KINETIC_QUESTION } from './ids.ts';

const Z = -0.04;
const TRACK_TOP = 0.022;
const CART = { width: 0.075, start: -0.34 };
const BLOCK = { size: 0.05, start: -0.12 };
/** 느린 화면: 실제 시간의 몇 배로 보여 줄지 (거리는 1 m = 1 단위 그대로) */
const SLOW = 3;
const FLAG_COLORS = [TINT.green, TINT.yellow, TINT.red] as const;

type Speed = (typeof SPEEDS)[number];

/** 수레가 나무토막을 밀어낸다. 밀려난 거리가 수레의 운동 에너지에 비례한다. */
export function KineticEnergyScene() {
  const { allow } = useLessonGate(KINETIC_QUESTION);
  const [speed, setSpeed] = useState<Speed>(1);
  const [phase, setPhase] = useState<'ready' | 'roll' | 'slide' | 'done'>('ready');
  const [flags, setFlags] = useState<Partial<Record<Speed, number>>>({});
  const time = useRef(0);
  const cart = useRef<THREE.Group>(null);
  const block = useRef<THREE.Group>(null);
  const spring = useRef<THREE.Group>(null);

  const contact = BLOCK.start - BLOCK.size / 2 - CART.width / 2;
  const deceleration = FRICTION * GRAVITY;

  useFrame((_, delta) => {
    let cartX = CART.start;
    let blockX = BLOCK.start;
    if (phase !== 'ready') time.current += delta / SLOW;
    const t = time.current;
    if (phase === 'roll') {
      cartX = Math.min(contact, CART.start + speed * t);
      if (cartX >= contact) {
        time.current = 0;
        setPhase('slide');
      }
    } else if (phase === 'slide' || phase === 'done') {
      cartX = contact;
      const stop = speed / deceleration;
      const s = Math.min(t, stop);
      blockX = BLOCK.start + speed * s - 0.5 * deceleration * s * s;
      if (phase === 'slide' && t >= stop) {
        setPhase('done');
        setFlags((current) => ({ ...current, [speed]: slideDistance(speed) }));
      }
    }
    if (cart.current) cart.current.position.x = cartX;
    if (block.current) block.current.position.x = blockX;
    if (spring.current) spring.current.scale.x = phase === 'ready' ? 0.55 : 1;
  });

  const start = () => {
    if (!allow()) return;
    time.current = 0;
    setPhase('roll');
  };
  const pick = (value: Speed) => () => {
    if (!allow()) return;
    time.current = 0;
    setSpeed(value);
    setPhase('ready');
  };

  const energy = kineticEnergy(1, speed);
  return (
    <group>
      {/* 레일 */}
      <PopUp at={0}>
        <mesh
          position={[0, TRACK_TOP / 2, Z]}
          material={inkMaterial(TINT.wood)}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.9, TRACK_TOP, 0.14]} />
          <InkLines />
        </mesh>
        {[-0.058, 0.058].map((dz) => (
          <mesh
            key={dz}
            position={[0, TRACK_TOP + 0.005, Z + dz]}
            material={inkMaterial(TINT.steel)}
          >
            <boxGeometry args={[0.88, 0.01, 0.008]} />
            <InkLines edges={false} width={1} />
          </mesh>
        ))}
      </PopUp>

      {/* 거리 눈금: 나무토막 처음 자리부터 5 cm마다 */}
      <PopUp at={0.12}>
        {Array.from({ length: 11 }, (_, i) => (
          <mesh key={i} position={[BLOCK.start + i * 0.05, TRACK_TOP + 0.0006, Z + 0.07]}>
            <boxGeometry args={[0.0025, 0.001, i % 2 === 0 ? 0.03 : 0.016]} />
            <meshBasicMaterial color={TINT.ink} />
          </mesh>
        ))}
      </PopUp>
      {[10, 20, 30, 40].map((cm) => (
        <PopUp
          key={cm}
          at={0.5}
          mode="grow"
          span={0.15}
          position={[BLOCK.start + cm / 100, 0.03, Z + 0.12]}
        >
          <Label text={`${cm} cm`} height={0.028} />
        </PopUp>
      ))}

      {/* 발사대(용수철) */}
      <PopUp at={0.2} span={0.25}>
        <mesh position={[-0.43, 0.06, Z]} material={inkMaterial(TINT.steel)} castShadow>
          <boxGeometry args={[0.028, 0.08, 0.1]} />
          <InkLines />
        </mesh>
        <group ref={spring} position={[-0.416, 0.05, Z]}>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} position={[0.008 + i * 0.008, 0, 0]} rotation-y={Math.PI / 2}>
              <torusGeometry args={[0.012, 0.0022, 6, 18]} />
              <meshBasicMaterial color={TINT.ink} />
            </mesh>
          ))}
        </group>
      </PopUp>

      {/* 수레 */}
      <PopUp at={0.3} span={0.25}>
        <group ref={cart} position={[CART.start, 0, Z]}>
          <mesh position={[0, TRACK_TOP + 0.038, 0]} material={inkMaterial(TINT.orange)} castShadow>
            <boxGeometry args={[CART.width, 0.034, 0.07]} />
            <InkLines />
          </mesh>
          {[-0.024, 0.024].flatMap((x) =>
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
        </group>
      </PopUp>

      {/* 나무토막 */}
      <PopUp at={0.38} span={0.25}>
        <group ref={block} position={[BLOCK.start, 0, Z]}>
          <mesh
            position={[0, TRACK_TOP + BLOCK.size / 2, 0]}
            material={inkMaterial(TINT.woodDark)}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[BLOCK.size, BLOCK.size, BLOCK.size]} />
            <InkLines />
          </mesh>
        </group>
      </PopUp>

      {/* 속력별로 나무토막이 멈춘 자리 */}
      {SPEEDS.map((value, index) => {
        const distance = flags[value];
        if (distance === undefined) return null;
        const x = BLOCK.start + distance;
        return (
          <group key={value} position={[x, TRACK_TOP, Z - 0.075]}>
            <mesh position={[0, 0.05, 0]} material={inkMaterial(TINT.ink)}>
              <cylinderGeometry args={[0.002, 0.002, 0.1, 6]} />
            </mesh>
            <mesh
              position={[0.018, 0.088, 0]}
              material={inkMaterial(FLAG_COLORS[index] ?? TINT.green)}
            >
              <boxGeometry args={[0.034, 0.022, 0.002]} />
              <InkLines width={1} />
            </mesh>
            <Label text={`${value} m/s`} height={0.026} position={[0.02, 0.12, 0]} />
          </group>
        );
      })}

      <PopUp at={0.62} mode="grow" span={0.18} position={[0, 0.25, Z]}>
        <Label
          text={
            phase === 'done'
              ? `${speed} m/s → ${energy.toFixed(2)} J → ${(slideDistance(speed) * 100).toFixed(0)} cm`
              : `수레 1 kg · 속력 ${speed} m/s · 운동 에너지 ${energy.toFixed(2)} J`
          }
          height={0.04}
        />
      </PopUp>

      {SPEEDS.map((value, index) => (
        <SceneButton
          key={value}
          id={`speed-${value}`}
          label={`${value} m/s`}
          position={[-0.36 + index * 0.18, 0, 0.34]}
          active={speed === value}
          onPress={pick(value)}
          width={0.15}
          at={0.74 + index * 0.04}
        />
      ))}
      <SceneButton
        id="start"
        label={phase === 'ready' ? '출발' : '다시'}
        position={[0.33, 0, 0.34]}
        onPress={phase === 'ready' ? start : pick(speed)}
        width={0.15}
        at={0.88}
      />
    </group>
  );
}
