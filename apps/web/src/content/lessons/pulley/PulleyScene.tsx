import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import { COLORS } from '../../../book/constants.ts';
import { InkLines } from '../../../ink/Ink.tsx';
import { inkMaterial } from '../../../ink/inkMaterial.ts';
import { playSound } from '../../../lib/sound.ts';
import { Bars } from '../../../scene/Bars.tsx';
import { createTextTexture, fontOf } from '../../../scene/canvasText.ts';
import { useLessonGate } from '../../../scene/gate.ts';
import { Label } from '../../../scene/Label.tsx';
import { TINT } from '../../../scene/palette.ts';
import { PopUp } from '../../../scene/PopUp.tsx';
import { createRope, type Rope } from '../../../scene/rope.ts';
import { SceneButton } from '../../../scene/SceneButton.tsx';
import { useSparkles } from '../../../scene/useSparkles.ts';
import { bookStore } from '../../../state/bookStore.ts';
import {
  BOARD,
  BOARD_SIZE,
  BOARD_TEXT,
  drawBoard,
  drawRuler,
  RIG_COLORS,
  RULER_TEXT,
  rulerPixels,
} from './board.ts';
import { LESSON_ID, PULLEY_QUESTION } from './ids.ts';
import {
  energyGained,
  heightFor,
  LIFT_HEIGHT,
  liftOf,
  LOAD_WEIGHT,
  RIGS,
  rigName,
  ropeFor,
  short,
  work,
  type Movable,
} from './physics.ts';

/** 1 m가 장면에서 몇 단위인지 */
const METER = 0.35;
/** 장치가 놓인 줄(페이지 위아래 방향 자리) */
const Z = -0.08;
/** 물체가 매달린 곳(가로 자리) */
const C = -0.31;
/** 도르래 반지름 */
const R = 0.024;
/** 받침판 윗면 */
const FLOOR = 0.03;
/** 물체(정육면체 추)의 한 변 */
const LOAD = 0.07;
/** 물체 윗면에서 고리(줄이나 움직도르래를 거는 곳)까지 */
const RING = 0.012;
const HOOK_REST = FLOOR + LOAD + RING;
/** 고리에서 움직도르래 축까지 */
const AXLE = 0.03 + R;
/** 고정 도르래 축의 높이 */
const TOP_Y = 0.52;
/** 들보 아랫면 */
const BEAM_Y = 0.56;
/** 당기는 줄이 수평으로 지나는 높이 = 고정 도르래 꼭대기 */
const RAIL_Y = TOP_Y + R;
/** 줄 끝(용수철저울)의 처음 자리 */
const HANDLE_X = -0.16;
/** 줄을 당기는 빠르기와 되돌리는 빠르기(m/s) */
const PULL_SPEED = 0.5;
const LOWER_SPEED = 1.5;

const PULL_RULER = { width: 0.6, height: 0.046, margin: 0.01 } as const;
const HEIGHT_RULER = { width: 0.04, height: 0.17, margin: 0.012 } as const;

/**
 * 도르래를 엮는 방법. 줄은 왼쪽에서 오른쪽으로 지그재그로 지난다:
 * 들보에 묶은 끝 → 움직도르래 아래 → 고정 도르래 위 → … → 마지막 고정 도르래 → 수평으로 당기는 손잡이.
 * 움직도르래가 없으면 줄을 물체에 바로 묶는다.
 */
interface Rig {
  /** 고정 도르래 축의 가로 자리(줄이 지나는 순서) */
  fixed: number[];
  /** 움직도르래 축의 가로 자리 */
  movable: number[];
  /** 줄 끝을 들보에 묶는 자리. null이면 물체의 고리에 묶는다. */
  tie: number | null;
}

const RIG: Record<Movable, Rig> = {
  0: { fixed: [C + R], movable: [], tie: null },
  1: { fixed: [C + 2 * R], movable: [C], tie: C - R },
  2: { fixed: [C, C + 4 * R], movable: [C - 2 * R, C + 2 * R], tie: C - 3 * R },
};

const MISSIONS = [
  '고정 도르래로 들어 올리기',
  '움직도르래 1개로 들어 올리기',
  '움직도르래 2개로 들어 올리기',
] as const;
const CONCLUSION =
  '도르래를 쓰면 힘은 줄지만 줄을 더 길게 당겨야 해서, 한 일은 같아요. (일의 원리)';

const HOLDING: Record<Movable, string> = {
  0: '줄 한 가닥이 들어요 → 힘은 무게 그대로 10 N',
  1: '줄 두 가닥이 나눠 들어요 → 힘은 절반인 5 N',
  2: '줄 네 가닥이 나눠 들어요 → 힘은 4분의 1인 2.5 N',
};

/** rest: 바닥에 놓임, up: 당기는 중, top: 다 올림, down: 내리는 중 */
type Step = 'rest' | 'up' | 'top' | 'down';

/** 도르래를 감아 도는 줄의 점들(각도는 라디안, 0 = 오른쪽, 반시계 방향) */
function wrap(rope: Rope, x: number, y: number, from: number, to: number, steps: number): void {
  for (let i = 0; i <= steps; i++) {
    const angle = from + ((to - from) * i) / steps;
    rope.add(x + Math.cos(angle) * R, y + Math.sin(angle) * R, Z);
  }
}

/** 줄을 놓는다. hookY는 물체 고리의 높이, handleX는 줄 끝(용수철저울)의 자리 */
function layRope(rope: Rope, rig: Rig, hookY: number, handleX: number): void {
  rope.begin();
  if (rig.tie === null) rope.add(C, hookY, Z);
  else rope.add(rig.tie, BEAM_Y, Z);
  rig.movable.forEach((x, index) => {
    // 움직도르래 아래로: 왼쪽 → 아래 → 오른쪽
    wrap(rope, x, hookY + AXLE, Math.PI, 2 * Math.PI, 6);
    const above = rig.fixed[index];
    // 고정 도르래 위로: 왼쪽 → 위 → 오른쪽 (마지막 고정 도르래는 아래에서 따로 감는다)
    if (above !== undefined && index < rig.fixed.length - 1) {
      wrap(rope, above, TOP_Y, Math.PI, 0, 6);
    }
  });
  // 마지막 고정 도르래: 왼쪽 → 꼭대기, 거기서 수평으로 손잡이까지
  wrap(rope, rig.fixed.at(-1) ?? C, TOP_Y, Math.PI, Math.PI / 2, 3);
  rope.add(handleX, RAIL_Y, Z);
  rope.commit();
}

/**
 * 도르래로 물체 들어 올리기. 움직도르래가 늘수록 당기는 힘은 줄지만 줄을 더 길게 당겨야 해서,
 * 힘 × 당긴 거리(일)는 늘 같다(일의 원리).
 */
export function PulleyScene() {
  const { allow } = useLessonGate(PULLEY_QUESTION);
  const [movable, setMovable] = useState<Movable>(0);
  const [step, setStep] = useState<Step>('rest');
  const [lifted, setLifted] = useState<Movable[]>([]);
  const rig = RIG[movable];
  const lift = liftOf(movable);

  /** 당긴 줄의 길이(m) */
  const pulled = useRef(0);
  /** 다음에 딸깍 소리를 낼 줄 길이(m) */
  const nextClick = useRef(0.2);
  const hook = useRef<THREE.Group>(null);
  const handle = useRef<THREE.Group>(null);
  const wheels = useRef(new Map<string, THREE.Group>());
  const keep = (key: string) => (group: THREE.Group | null) => {
    if (group) wheels.current.set(key, group);
    else wheels.current.delete(key);
  };

  const rope = useMemo(() => createRope(34), []);
  useEffect(() => () => rope.dispose(), [rope]);
  const sparkles = useSparkles();

  const boardTexture = useMemo(
    () =>
      createTextTexture(
        BOARD_SIZE.width,
        BOARD_SIZE.height,
        (ctx) => drawBoard(ctx, lifted),
        BOARD_TEXT,
      ),
    [lifted],
  );
  useEffect(() => () => boardTexture.dispose(), [boardTexture]);
  const pullRuler = useMemo(
    () =>
      createTextTexture(
        ...rulerPixels(PULL_RULER.width, PULL_RULER.height),
        (ctx) =>
          drawRuler(ctx, {
            vertical: false,
            meter: METER,
            margin: PULL_RULER.margin,
            length: 1.6,
            step: 0.2,
            labels: [0, 0.4, 0.8, 1.2, 1.6],
          }),
        RULER_TEXT,
      ),
    [],
  );
  useEffect(() => () => pullRuler.dispose(), [pullRuler]);
  const heightRuler = useMemo(
    () =>
      createTextTexture(
        ...rulerPixels(HEIGHT_RULER.width, HEIGHT_RULER.height),
        (ctx) =>
          drawRuler(ctx, {
            vertical: true,
            meter: METER,
            margin: HEIGHT_RULER.margin,
            length: 0.4,
            step: 0.1,
            labels: [0, 0.2, 0.4],
          }),
        RULER_TEXT,
      ),
    [],
  );
  useEffect(() => () => heightRuler.dispose(), [heightRuler]);
  const weightTag = useMemo(
    () =>
      createTextTexture(
        240,
        120,
        (ctx, w, h) => {
          ctx.font = fontOf(800, 64);
          ctx.fillStyle = COLORS.ink;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${LOAD_WEIGHT} N`, w / 2, h / 2 + 4);
        },
        `${LOAD_WEIGHT} N`,
      ),
    [],
  );
  useEffect(() => () => weightTag.dispose(), [weightTag]);

  // 화면 위 탐구 과제판에 진행 상황을 알린다.
  useEffect(() => {
    bookStore.getState().setMissions(LESSON_ID, {
      items: MISSIONS.map((label, index) => ({
        label,
        done: lifted.includes(RIGS[index] ?? 0),
      })),
      conclusion: CONCLUSION,
    });
  }, [lifted]);
  useEffect(() => () => bookStore.getState().setMissions(LESSON_ID, null), []);

  useFrame((_, delta) => {
    const full = ropeFor(movable, LIFT_HEIGHT);
    if (step === 'up') {
      pulled.current = Math.min(full, pulled.current + delta * PULL_SPEED);
      // 줄이 0.2 m 지날 때마다 딸깍
      if (pulled.current >= nextClick.current) {
        nextClick.current += 0.2;
        playSound('tap', { volume: 0.32 });
      }
      if (pulled.current >= full) {
        setStep('top');
        playSound('knock', { volume: 0.5 });
        const hookY = HOOK_REST + LIFT_HEIGHT * METER;
        sparkles.burst(C, hookY - 0.04, Z + 0.06, 0.32);
        if (!lifted.includes(movable)) {
          const next = [...lifted, movable];
          setLifted(next);
          if (RIGS.every((item) => next.includes(item))) {
            playSound('correct', { delay: 0.5 });
            sparkles.burst(0.2, 0.3, -0.2, 0.6);
          }
        }
      }
    } else if (step === 'down') {
      pulled.current = Math.max(0, pulled.current - delta * LOWER_SPEED);
      if (pulled.current <= 0) setStep('rest');
    }

    const rise = heightFor(movable, pulled.current) * METER;
    const hookY = HOOK_REST + rise;
    const handleX = HANDLE_X + pulled.current * METER;
    if (hook.current) hook.current.position.y = hookY;
    if (handle.current) handle.current.position.x = handleX;
    layRope(rope, rig, hookY, handleX);

    // 도르래는 줄이 지나간 길이만큼 돈다. 줄이 지나는 순서대로 1, 2, 3, 4배 빠르다.
    rig.movable.forEach((_x, index) => {
      const wheel = wheels.current.get(`m${index}`);
      if (wheel) wheel.rotation.z = ((2 * index + 1) * rise) / R;
    });
    rig.fixed.forEach((_x, index) => {
      const wheel = wheels.current.get(`f${index}`);
      const turns = rig.movable.length === 0 ? 1 : 2 * index + 2;
      if (wheel) wheel.rotation.z = -(turns * rise) / R;
    });
  });

  const reset = () => {
    pulled.current = 0;
    nextClick.current = 0.2;
    setStep('rest');
  };
  const pull = () => {
    if (!allow()) return;
    if (step === 'rest') {
      nextClick.current = 0.2;
      setStep('up');
    } else if (step === 'top') {
      setStep('down');
    }
  };
  const pick = (value: Movable) => () => {
    if (!allow()) return;
    reset();
    setMovable(value);
  };

  /** 막대 그래프가 읽는 값: 힘, 당긴 거리, 한 일(가장 큰 값을 1로) */
  const readings = (): number[] => {
    const distance = pulled.current;
    return [
      distance > 0 ? lift.force / LOAD_WEIGHT : 0,
      distance / ropeFor(2, LIFT_HEIGHT),
      work(lift.force, distance) / energyGained(LIFT_HEIGHT),
    ];
  };

  const banner: { tag?: string; text: string } =
    step === 'up'
      ? { tag: '힘', text: HOLDING[movable] }
      : step === 'top'
        ? {
            tag: '일의 원리',
            text: `${short(lift.force)} N × ${short(lift.distance)} m = ${short(lift.work)} J · 직접 들 때와 같아요`,
          }
        : { text: `${rigName(movable)} · 물체의 무게 ${LOAD_WEIGHT} N` };
  const reading =
    step === 'rest' || step === 'down'
      ? '0 N'
      : step === 'top'
        ? `${short(lift.force)} N · ${short(lift.distance)} m 당김`
        : `${short(lift.force)} N`;

  return (
    <group>
      {/* 틀: 받침판, 두 기둥, 들보 */}
      <PopUp at={0}>
        <mesh
          position={[C, FLOOR / 2, Z]}
          material={inkMaterial(TINT.wood)}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.28, FLOOR, 0.19]} />
          <InkLines />
        </mesh>
        {[-0.465, 0.485].map((x) => (
          <mesh
            key={x}
            position={[x, BEAM_Y / 2, Z]}
            material={inkMaterial(TINT.woodDark)}
            castShadow
          >
            <boxGeometry args={[0.022, BEAM_Y, 0.022]} />
            <InkLines />
          </mesh>
        ))}
        <mesh
          position={[0.01, BEAM_Y + 0.0125, Z]}
          material={inkMaterial(TINT.woodDark)}
          castShadow
        >
          <boxGeometry args={[0.975, 0.025, 0.034]} />
          <InkLines />
        </mesh>
      </PopUp>

      {/* 자: 물체가 올라간 높이(세로), 당긴 줄의 길이(가로) */}
      <PopUp at={0.1}>
        <mesh
          position={[C - 0.118, FLOOR + HEIGHT_RULER.height / 2 - HEIGHT_RULER.margin, Z - 0.004]}
          material={inkMaterial(TINT.card)}
          castShadow
        >
          <boxGeometry args={[HEIGHT_RULER.width + 0.004, HEIGHT_RULER.height + 0.004, 0.006]} />
          <InkLines />
        </mesh>
        <mesh position={[C - 0.118, FLOOR + HEIGHT_RULER.height / 2 - HEIGHT_RULER.margin, Z]}>
          <planeGeometry args={[HEIGHT_RULER.width, HEIGHT_RULER.height]} />
          <meshBasicMaterial map={heightRuler} toneMapped={false} />
        </mesh>
        <mesh
          position={[
            HANDLE_X - PULL_RULER.margin + PULL_RULER.width / 2,
            (BEAM_Y + RAIL_Y - 0.036 - PULL_RULER.height / 2) / 2,
            Z - 0.019,
          ]}
          material={inkMaterial(TINT.card)}
          castShadow
        >
          <boxGeometry
            args={[
              PULL_RULER.width + 0.004,
              BEAM_Y - (RAIL_Y - 0.036 - PULL_RULER.height / 2),
              0.006,
            ]}
          />
          <InkLines />
        </mesh>
        <mesh
          position={[
            HANDLE_X - PULL_RULER.margin + PULL_RULER.width / 2,
            RAIL_Y - 0.036,
            Z - 0.0155,
          ]}
        >
          <planeGeometry args={[PULL_RULER.width, PULL_RULER.height]} />
          <meshBasicMaterial map={pullRuler} toneMapped={false} />
        </mesh>
      </PopUp>

      {/* 고정 도르래(들보에 매달려 있다)와 줄 */}
      <PopUp at={0.18}>
        {rig.fixed.map((x, index) => (
          <group key={x} position={[x, TOP_Y, Z]}>
            {[-0.009, 0.009].map((side) => (
              <mesh
                key={side}
                position={[0, (BEAM_Y - TOP_Y) / 2, side]}
                material={inkMaterial(TINT.steel)}
              >
                <boxGeometry args={[0.007, BEAM_Y - TOP_Y + 0.012, 0.003]} />
                <InkLines width={1} outline={false} />
              </mesh>
            ))}
            <Wheel keep={keep(`f${index}`)} />
          </group>
        ))}
        {rig.tie !== null && (
          <mesh position={[rig.tie, BEAM_Y - 0.004, Z]}>
            <sphereGeometry args={[0.006, 10, 8]} />
            <meshBasicMaterial color={COLORS.ink} />
          </mesh>
        )}
        <primitive object={rope.mesh} />
      </PopUp>

      {/* 물체와 움직도르래: 고리 높이를 원점으로 함께 오르내린다. */}
      <PopUp at={0.26} span={0.26}>
        <group ref={hook} position={[0, HOOK_REST, Z]}>
          <mesh
            position={[C, -RING - LOAD / 2, 0]}
            material={inkMaterial(TINT.brass)}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[LOAD, LOAD, LOAD]} />
            <InkLines />
          </mesh>
          <mesh position={[C, -RING - LOAD / 2, LOAD / 2 + 0.0012]}>
            <planeGeometry args={[0.062, 0.031]} />
            <meshBasicMaterial map={weightTag} transparent toneMapped={false} />
          </mesh>
          <mesh position={[C, -RING / 2, 0]}>
            <torusGeometry args={[0.007, 0.0018, 6, 14]} />
            <meshBasicMaterial color={COLORS.ink} />
          </mesh>
          {rig.movable.map((x, index) => (
            <group key={x} position={[x, AXLE, 0]}>
              <Wheel keep={keep(`m${index}`)} />
            </group>
          ))}
          {rig.movable.length > 0 &&
            [-0.009, 0.009].map((side) => (
              <group key={side} position={[0, 0, side]}>
                {/* 도르래 축을 잇는 가로대와 물체를 거는 세로대 */}
                {rig.movable.length > 1 && (
                  <mesh position={[C, AXLE, 0]} material={inkMaterial(TINT.steel)}>
                    <boxGeometry args={[4 * R + 0.014, 0.008, 0.003]} />
                    <InkLines width={1} outline={false} />
                  </mesh>
                )}
                <mesh position={[C, AXLE / 2, 0]} material={inkMaterial(TINT.steel)}>
                  <boxGeometry args={[0.007, AXLE + 0.008, 0.003]} />
                  <InkLines width={1} outline={false} />
                </mesh>
              </group>
            ))}
        </group>
      </PopUp>

      {/* 용수철저울: 줄 끝을 잡고 오른쪽으로 당긴다. 위의 꼬리표가 당기는 힘을 알려 준다. */}
      <PopUp at={0.32} span={0.26}>
        <group ref={handle} position={[HANDLE_X, RAIL_Y, Z]}>
          <mesh position={[0.037, 0, 0]} material={inkMaterial(TINT.card)} castShadow>
            <boxGeometry args={[0.064, 0.024, 0.02]} />
            <InkLines />
          </mesh>
          <mesh position={[0.012 + 0.046 * (lift.force / LOAD_WEIGHT), 0, 0.0105]}>
            <planeGeometry args={[0.005, 0.02]} />
            <meshBasicMaterial color={COLORS.accent} toneMapped={false} />
          </mesh>
          <mesh position={[0.079, 0, 0]}>
            <torusGeometry args={[0.01, 0.0022, 6, 16]} />
            <meshBasicMaterial color={COLORS.ink} />
          </mesh>
          {/* 자의 눈금을 가리키는 세모 */}
          <mesh position={[0, -0.02, 0.004]} rotation-z={Math.PI}>
            <coneGeometry args={[0.007, 0.014, 3]} />
            <meshBasicMaterial color={COLORS.accent} toneMapped={false} />
          </mesh>
          <Label
            text={reading}
            height={0.042}
            color={step === 'rest' || step === 'down' ? COLORS.muted : COLORS.accent}
            position={[0.04, 0.088, 0.03]}
          />
        </group>
      </PopUp>

      {/* 칠판: 도르래마다 힘, 당긴 거리, 한 일을 적는다. */}
      <PopUp at={0.4} span={0.3}>
        {[-0.22, 0.22].map((x) => (
          <mesh
            key={x}
            position={[0.2 + x, 0.065, -0.356]}
            material={inkMaterial(TINT.woodDark)}
            castShadow
          >
            <boxGeometry args={[0.02, 0.13, 0.02]} />
            <InkLines />
          </mesh>
        ))}
        <group position={[0.2, 0.09, -0.34]} rotation-x={-0.14}>
          <group position={[0, BOARD.height / 2, 0]}>
            <mesh position={[0, 0, -0.008]} material={inkMaterial(TINT.wood)} castShadow>
              <boxGeometry args={[BOARD.width + 0.028, BOARD.height + 0.028, 0.014]} />
              <InkLines />
            </mesh>
            <mesh>
              <planeGeometry args={[BOARD.width, BOARD.height]} />
              <meshBasicMaterial map={boardTexture} toneMapped={false} />
            </mesh>
          </group>
        </group>
      </PopUp>

      {/* 힘은 줄고 거리는 늘지만, 일은 늘 같은 높이까지 찬다. */}
      <Bars
        position={[0.33, 0, 0.01]}
        bars={[
          { label: '힘', color: RIG_COLORS[movable] },
          { label: '거리', color: TINT.blue },
          { label: '일', color: TINT.yellow },
        ]}
        getValues={readings}
        max={1.02}
        height={0.17}
        at={0.5}
      />

      {/* 지금 일어나는 일을 알리는 꼬리표: 장치 앞, 단추 위 */}
      <PopUp at={0.62} mode="grow" span={0.18} position={[-0.05, 0.04, 0.17]}>
        <Label text={banner.text} tag={banner.tag} height={0.05} />
      </PopUp>

      <primitive object={sparkles.points} />

      <SceneButton
        id="pull"
        label={
          step === 'rest'
            ? '당기기'
            : step === 'up'
              ? '당기는 중'
              : step === 'top'
                ? '내리기'
                : '내리는 중'
        }
        position={[-0.36, 0, 0.3]}
        width={0.17}
        active={step === 'rest'}
        disabled={step === 'up' || step === 'down'}
        onPress={pull}
      />
      {RIGS.map((value, index) => (
        <SceneButton
          key={value}
          id={`rig-${value}`}
          label={rigName(value)}
          position={[[-0.155, 0.075, 0.315][index] ?? 0, 0, 0.3]}
          width={value === 0 ? 0.2 : 0.225}
          active={movable === value}
          onPress={pick(value)}
          at={0.8 + index * 0.03}
        />
      ))}
    </group>
  );
}

/** 도르래 바퀴. 도는 것이 보이도록 바퀴살을 그린다. */
function Wheel({ keep }: { keep: (group: THREE.Group | null) => void }) {
  return (
    <group ref={keep}>
      <mesh rotation-x={Math.PI / 2} material={inkMaterial(TINT.brass)} castShadow>
        <cylinderGeometry args={[R, R, 0.012, 24]} />
        <InkLines width={1.1} />
      </mesh>
      {[0, Math.PI / 2].map((turn) => (
        <mesh key={turn} rotation-z={turn}>
          <boxGeometry args={[R * 1.7, 0.003, 0.0134]} />
          <meshBasicMaterial color={COLORS.ink} />
        </mesh>
      ))}
    </group>
  );
}
