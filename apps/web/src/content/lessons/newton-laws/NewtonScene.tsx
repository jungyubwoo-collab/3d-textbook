import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { COLORS } from '../../../book/constants.ts';
import { InkLines } from '../../../ink/Ink.tsx';
import { inkMaterial } from '../../../ink/inkMaterial.ts';
import { playSound } from '../../../lib/sound.ts';
import { createTextTexture } from '../../../scene/canvasText.ts';
import { createDots } from '../../../scene/dots.ts';
import { useLessonGate } from '../../../scene/gate.ts';
import { Glow } from '../../../scene/Glow.tsx';
import { Label } from '../../../scene/Label.tsx';
import { TINT } from '../../../scene/palette.ts';
import { PopUp } from '../../../scene/PopUp.tsx';
import { PushArrow } from '../../../scene/PushArrow.tsx';
import { createRope, type Rope } from '../../../scene/rope.ts';
import { SceneButton } from '../../../scene/SceneButton.tsx';
import { useImpact } from '../../../scene/useImpact.ts';
import { useSparkles } from '../../../scene/useSparkles.ts';
import { bookStore } from '../../../state/bookStore.ts';
import {
  BOARD,
  BOARD_TEXT,
  boardPoint,
  drawBoard,
  drawTape,
  lineColorOf,
  TAPE,
  TAPE_DOT_DROP,
  TAPE_TEXT,
} from './board.ts';
import { LESSON_ID, NEWTON_QUESTION } from './ids.ts';
import {
  addRecord,
  cartAt,
  COAST_DISTANCE,
  insightOf,
  missionsOf,
  planRun,
  PULL_DISTANCE,
  sameSetup,
  tapeDots,
  TICK,
  type Bricks,
  type CartState,
  type Setup,
  type Weights,
} from './physics.ts';

/** 1 m가 장면에서 몇 단위인지 */
const METER = 0.4;
/** 실험 시간을 이만큼 느리게 보여 준다. */
const SLOW = 1.5;
/** 실험대 가운데 줄(페이지 위아래 방향 자리) */
const Z = -0.1;

const BENCH = { top: 0.31, left: -0.46, right: 0.3, depth: 0.2, slab: 0.022 } as const;
const BENCH_MID = (BENCH.left + BENCH.right) / 2;
const TRACK_TOP = BENCH.top + 0.012;
const CART = { length: 0.11, height: 0.036, depth: 0.076, wheel: 0.013 } as const;
/** 줄이 지나는 높이 = 수레의 고리 = 도르래 꼭대기 */
const STRING_Y = TRACK_TOP + 0.046;
const PULLEY = { x: 0.318, y: STRING_Y - 0.03, radius: 0.03 } as const;
/** 추걸이가 오르내리는 줄의 자리 */
const DROP_X = PULLEY.x + PULLEY.radius;
const PAD_TOP = 0.02;
/** 추걸이 바닥에서 줄을 매는 고리까지의 높이 */
const HANGER_TOP = 0.056;
/** 범퍼의 수레 쪽 면 */
const BUMPER_X = 0.25;
const CART_END = BUMPER_X - CART.length / 2;
const CART_START = CART_END - (PULL_DISTANCE + COAST_DISTANCE) * METER;

const TAPE_LEFT = BENCH_MID - TAPE.width / 2;
const TAPE_TOP = BENCH.top - 0.004;
const TAPE_Z = Z + BENCH.depth / 2 + 0.0012;

const BOARD_Z = -0.31;
const BOARD_BOTTOM = 0.385;
const BOARD_TILT = 0.14;
/** 그래프 위의 선이 칠판에서 떠 있는 높이 */
const LINE_LIFT = 0.003;

const MISSIONS = [
  '출발을 눌러 한 번 기록하기',
  '추의 수만 바꿔 다시 하기 (힘 바꾸기)',
  '벽돌 수만 바꿔 다시 하기 (질량 바꾸기)',
] as const;
const CONCLUSION = '가속도는 힘에 비례하고 질량에 반비례해요.  a = F ÷ m';

/** ready: 출발 전, pull: 추가 끄는 중, coast: 힘 없이 가는 중, stop: 범퍼에 막 닿음, result: 결과 보기 */
type Step = 'ready' | 'pull' | 'coast' | 'stop' | 'result';
type Flags = [boolean, boolean, boolean];

const AT_REST: CartState = { phase: 'pull', distance: 0, speed: 0 };
const { damp } = THREE.MathUtils;

/**
 * 수레 고리에서 도르래를 넘어 추걸이까지 줄을 놓는다.
 * slack은 남는 줄의 길이: 추가 바닥에 닿은 뒤 수레가 더 가면 줄이 느슨해져 처진다.
 */
function layRope(rope: Rope, hookX: number, hangerTopY: number, slack: number): void {
  rope.begin();
  const span = Math.max(0.001, PULLEY.x - hookX);
  const sag = slack > 0 ? Math.sqrt((3 * span * slack * 0.5) / 8) : 0;
  for (let i = 0; i <= 8; i++) {
    const s = i / 8;
    // 처진 줄은 레일 위에 놓인다.
    rope.add(hookX + span * s, Math.max(TRACK_TOP + 0.004, STRING_Y - sag * 4 * s * (1 - s)), Z);
  }
  for (const degrees of [60, 30, 0]) {
    const angle = (degrees * Math.PI) / 180;
    rope.add(
      PULLEY.x + Math.cos(angle) * PULLEY.radius,
      PULLEY.y + Math.sin(angle) * PULLEY.radius,
      Z,
    );
  }
  const length = PULLEY.y - hangerTopY;
  const bulge = slack > 0 ? Math.min(0.045, Math.sqrt(4 * length * slack * 0.5) / Math.PI) : 0;
  for (let i = 1; i <= 7; i++) {
    const s = i / 7;
    rope.add(DROP_X + bulge * Math.sin(Math.PI * s), PULLEY.y - length * s, Z);
  }
  rope.commit();
}

/**
 * 수레와 추 실험. 도르래에 걸친 줄 끝의 추가 수레를 끈다.
 * - 추가 끄는 동안: 속력이 고르게 빨라진다(제2법칙, 가속도 = 힘 ÷ 질량).
 * - 추가 바닥에 닿아 힘이 0이 되면: 그 속력 그대로 간다(제1법칙, 관성).
 * - 범퍼에 부딪히면: 수레와 범퍼가 서로 같은 크기의 힘으로 민다(제3법칙).
 * 기록 테이프의 점(0.1초마다)과 칠판의 속력–시간 그래프가 운동을 남긴다.
 */
export function NewtonScene() {
  const { allow } = useLessonGate(NEWTON_QUESTION);
  const [setup, setSetup] = useState<Setup>({ weights: 1, bricks: 0 });
  const [step, setStep] = useState<Step>('ready');
  const [records, setRecords] = useState<Setup[]>([]);
  const [missions, setMissions] = useState<Flags>([false, false, false]);
  const [insight, setInsight] = useState<string | null>(null);
  const run = useMemo(() => planRun(setup), [setup]);
  const concluded = missions.every(Boolean);

  /** 출발한 뒤 흐른 실험 시간(초) */
  const clock = useRef(0);
  /** 범퍼에 닿은 뒤 흐른 시간(초) */
  const rest = useRef(0);
  const landed = useRef(false);
  /** 화면에 보이는 수레의 이동 거리(m). 처음으로 돌아갈 때는 부드럽게 줄어든다. */
  const shown = useRef(0);
  /** 화살표가 매 프레임 읽는 값 */
  const arrows = useRef({ cartX: CART_START, force: 0, push: 0 });

  const cart = useRef<THREE.Group>(null);
  const hanger = useRef<THREE.Group>(null);
  const wheel = useRef<THREE.Group>(null);
  const pullLine = useRef<THREE.Mesh>(null);
  const coastLine = useRef<THREE.Mesh>(null);
  const marker = useRef<THREE.Group>(null);

  const rope = useMemo(() => createRope(24), []);
  useEffect(() => () => rope.dispose(), [rope]);
  const dots = useMemo(() => createDots(48), []);
  useEffect(() => () => dots.dispose(), [dots]);
  const impact = useImpact(5);
  const sparkles = useSparkles();

  /** 그래프 칸의 안내 글: 기록이 없고 아직 출발하지 않았을 때만 */
  const hint = records.length === 0 && step === 'ready';
  const boardTexture = useMemo(
    () =>
      createTextTexture(
        BOARD.width * BOARD.pixels,
        BOARD.height * BOARD.pixels,
        (ctx) => drawBoard(ctx, records, concluded, hint),
        BOARD_TEXT,
      ),
    [records, concluded, hint],
  );
  useEffect(() => () => boardTexture.dispose(), [boardTexture]);
  const tapeTexture = useMemo(
    () =>
      createTextTexture(
        TAPE.width * BOARD.pixels,
        TAPE.height * BOARD.pixels,
        (ctx) =>
          drawTape(ctx, {
            start: CART_START - TAPE_LEFT,
            meter: METER,
            land: PULL_DISTANCE,
            end: PULL_DISTANCE + COAST_DISTANCE,
          }),
        TAPE_TEXT,
      ),
    [],
  );
  useEffect(() => () => tapeTexture.dispose(), [tapeTexture]);
  /** 그래프 위의 선(왼쪽 끝이 원점인 가는 막대) */
  const lineGeometry = useMemo(
    () => new THREE.BoxGeometry(1, 0.0056, 0.0012).translate(0.5, 0, 0),
    [],
  );
  useEffect(() => () => lineGeometry.dispose(), [lineGeometry]);

  // 기록 테이프의 점: 끄는 동안은 주황, 힘이 사라진 뒤는 파랑
  useEffect(() => {
    dots.place(
      tapeDots(run).map((dot) => ({
        x: CART_START + dot.distance * METER,
        y: TAPE_TOP - TAPE_DOT_DROP,
        z: TAPE_Z + 0.0012,
        color: dot.phase === 'pull' ? COLORS.accent : COLORS.pencil,
      })),
    );
  }, [dots, run]);

  // 화면 위 탐구 과제판에 진행 상황을 알린다.
  useEffect(() => {
    bookStore.getState().setMissions(LESSON_ID, {
      items: MISSIONS.map((label, index) => ({ label, done: missions[index] ?? false })),
      conclusion: CONCLUSION,
    });
  }, [missions]);
  useEffect(() => () => bookStore.getState().setMissions(LESSON_ID, null), []);

  useFrame((_, delta) => {
    const running = step === 'pull' || step === 'coast';
    if (running) clock.current += delta / SLOW;
    const state = step === 'ready' ? AT_REST : cartAt(run, clock.current);

    if (running) {
      if (!landed.current && state.phase !== 'pull') {
        // 추가 바닥에 닿았다: 이제 끄는 힘이 없다.
        landed.current = true;
        setStep('coast');
        playSound('knock', { volume: 0.45 });
        impact.fire(DROP_X, PAD_TOP + 0.014, Z + 0.06, 0.08);
      }
      if (state.phase === 'stop') {
        // 범퍼에 부딪혔다: 기록을 남기고 과제를 확인한다.
        rest.current = 0;
        setStep('stop');
        playSound('knock');
        impact.fire(BUMPER_X + 0.004, TRACK_TOP + 0.04, Z + 0.06, 0.13);
        const next = addRecord(records, setup);
        const now = missionsOf(next);
        const merged: Flags = [missions[0] || now[0], missions[1] || now[1], missions[2] || now[2]];
        setInsight(
          insightOf(
            setup,
            records.filter((record) => !sameSetup(record, setup)),
          ),
        );
        setRecords(next);
        setMissions(merged);
        if (merged.every(Boolean) && !concluded) {
          playSound('correct', { delay: 0.6 });
          sparkles.burst(0, BOARD_BOTTOM + BOARD.height * 0.55, BOARD_Z + 0.06);
        }
      }
    } else if (step === 'stop' || step === 'result') {
      rest.current += delta;
      if (step === 'stop' && rest.current > 1.9) setStep('result');
    }

    // 수레, 추걸이, 도르래, 줄
    shown.current = step === 'ready' ? damp(shown.current, 0, 10, delta) : state.distance;
    if (step === 'ready' && shown.current < 0.0005) shown.current = 0;
    const distance = shown.current;
    const stopped = step === 'stop' || step === 'result';
    // 범퍼의 용수철에 살짝 튕겼다가 멈춘다.
    const recoil = stopped
      ? -0.012 * Math.exp(-5 * rest.current) * Math.abs(Math.sin(13 * rest.current))
      : 0;
    const cartX = CART_START + distance * METER + recoil;
    const hangerY = PAD_TOP + Math.max(0, PULL_DISTANCE - distance) * METER;
    if (cart.current) cart.current.position.x = cartX;
    if (hanger.current) hanger.current.position.y = hangerY;
    if (wheel.current) {
      wheel.current.rotation.z = -(Math.min(distance, PULL_DISTANCE) * METER) / PULLEY.radius;
    }
    layRope(
      rope,
      cartX + CART.length / 2 + 0.004,
      hangerY + HANGER_TOP,
      Math.max(0, distance - PULL_DISTANCE) * METER,
    );

    const time = Math.min(clock.current, run.hitAt);
    dots.show(step === 'ready' ? 0 : Math.floor(time / TICK + 1e-6) + 1);

    arrows.current.cartX = cartX;
    arrows.current.force = step === 'pull' ? run.force : 0;
    arrows.current.push = stopped
      ? Math.min(1, rest.current / 0.12) *
        THREE.MathUtils.clamp(0.045 + 0.03 * run.mass * run.topSpeed, 0.06, 0.14)
      : 0;

    // 칠판 그래프 위에 지금 달리는 수레의 선을 긋는다.
    // 결과를 볼 때는 칠판에 분필로 남긴 선이 있으므로 빛나는 선은 거둔다(점만 남긴다).
    const drawing = step !== 'ready' && step !== 'result';
    const pulled = Math.min(time, run.landAt);
    const [x0, y0] = boardPoint(0, 0);
    const [x1, y1] = boardPoint(pulled, run.a * pulled);
    if (pullLine.current) {
      const length = Math.hypot(x1 - x0, y1 - y0);
      pullLine.current.visible = drawing && length > 0.001;
      pullLine.current.position.set(x0, y0, LINE_LIFT);
      pullLine.current.rotation.z = Math.atan2(y1 - y0, x1 - x0);
      pullLine.current.scale.x = Math.max(0.0001, length);
    }
    const [x2] = boardPoint(Math.max(time, run.landAt), run.topSpeed);
    if (coastLine.current) {
      coastLine.current.visible = drawing && time > run.landAt;
      coastLine.current.position.set(x1, y1, LINE_LIFT);
      coastLine.current.scale.x = Math.max(0.0001, x2 - x1);
    }
    if (marker.current) {
      marker.current.visible = step !== 'ready';
      marker.current.position.set(time > run.landAt ? x2 : x1, y1, LINE_LIFT + 0.002);
    }
  });

  const reset = () => {
    clock.current = 0;
    rest.current = 0;
    landed.current = false;
    setInsight(null);
    setStep('ready');
  };
  const start = () => {
    if (!allow()) return;
    if (step === 'pull' || step === 'coast') {
      reset();
      return;
    }
    reset();
    // 수레를 출발점에 놓고 바로 놓아 준다.
    shown.current = 0;
    setStep('pull');
    playSound('whoosh', { volume: 0.7 });
  };
  const pickWeights = (weights: Weights) => () => {
    if (!allow()) return;
    reset();
    setSetup((value) => ({ ...value, weights }));
  };
  const pickBricks = (bricks: Bricks) => () => {
    if (!allow()) return;
    reset();
    setSetup((value) => ({ ...value, bricks }));
  };
  const clear = () => {
    if (!allow()) return;
    reset();
    setRecords([]);
  };

  const banner: { tag?: string; text: string } =
    step === 'ready'
      ? { text: `끄는 힘 ${run.force.toFixed(2)} N · 전체 질량 ${run.mass} kg` }
      : step === 'pull'
        ? { tag: '제2법칙', text: '힘이 끄는 동안 속력이 고르게 빨라져요' }
        : step === 'coast'
          ? { tag: '제1법칙', text: '힘이 0이 되어도 같은 속력으로 계속 가요' }
          : step === 'stop'
            ? { tag: '제3법칙', text: '쾅! 서로 미는 힘은 크기가 같아요' }
            : {
                tag: '결과',
                text:
                  insight ??
                  `가속도 ${run.a.toFixed(2)} m/s² = ${run.force.toFixed(2)} N ÷ ${run.mass} kg`,
              };

  const rows = [0.245, 0.335] as const;
  const columns = [-0.345, -0.118, 0.082, 0.282] as const;
  return (
    <group>
      {/* 실험대: 상판, 앞판(기록 테이프와 자), 다리 */}
      <PopUp at={0}>
        <mesh
          position={[BENCH_MID, BENCH.top - BENCH.slab / 2, Z]}
          material={inkMaterial(TINT.wood)}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[BENCH.right - BENCH.left, BENCH.slab, BENCH.depth]} />
          <InkLines />
        </mesh>
        <mesh
          position={[BENCH_MID, TAPE_TOP - TAPE.height / 2, Z + BENCH.depth / 2 - 0.004]}
          material={inkMaterial(TINT.woodDark)}
          castShadow
        >
          <boxGeometry args={[BENCH.right - BENCH.left, TAPE.height + 0.008, 0.008]} />
          <InkLines />
        </mesh>
        <mesh position={[BENCH_MID, TAPE_TOP - TAPE.height / 2, TAPE_Z]}>
          <planeGeometry args={[TAPE.width, TAPE.height]} />
          <meshBasicMaterial map={tapeTexture} toneMapped={false} />
        </mesh>
        {[BENCH.left + 0.02, BENCH.right - 0.02].flatMap((x) =>
          [-1, 1].map((side) => (
            <mesh
              key={`${x}${side}`}
              position={[
                x,
                (BENCH.top - BENCH.slab) / 2,
                Z + side * (BENCH.depth / 2 - 0.014) - (side > 0 ? 0.008 : 0),
              ]}
              material={inkMaterial(TINT.woodDark)}
              castShadow
            >
              <boxGeometry args={[0.022, BENCH.top - BENCH.slab, 0.022]} />
              <InkLines />
            </mesh>
          )),
        )}
        <primitive object={dots.mesh} />
      </PopUp>

      {/* 레일과 범퍼(용수철 달린 두 기둥 사이로 줄이 지난다) */}
      <PopUp at={0.08}>
        <mesh
          position={[BENCH_MID - 0.005, BENCH.top + 0.006, Z]}
          material={inkMaterial(TINT.metal)}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[BENCH.right - BENCH.left - 0.03, 0.012, 0.11]} />
          <InkLines />
        </mesh>
        {[-0.03, 0.03].map((side) => (
          <group key={side} position={[BUMPER_X, TRACK_TOP, Z + side]}>
            <mesh position={[0.018, 0.019, 0]} material={inkMaterial(TINT.steel)} castShadow>
              <boxGeometry args={[0.016, 0.038, 0.016]} />
              <InkLines />
            </mesh>
            {[0.002, 0.005, 0.008].map((x) => (
              <mesh key={x} position={[x, 0.024, 0]} rotation-y={Math.PI / 2}>
                <torusGeometry args={[0.0058, 0.0014, 6, 14]} />
                <meshBasicMaterial color={COLORS.ink} />
              </mesh>
            ))}
          </group>
        ))}
        {/* 추가 바닥에 닿는 곳을 알리는 깃발 */}
        <group
          position={[CART_START + PULL_DISTANCE * METER, BENCH.top, Z + BENCH.depth / 2 - 0.012]}
        >
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.0016, 0.0016, 0.06, 6]} />
            <meshBasicMaterial color={COLORS.ink} />
          </mesh>
          <mesh position={[0.012, 0.05, 0]} material={inkMaterial(TINT.red)}>
            <boxGeometry args={[0.024, 0.016, 0.002]} />
            <InkLines outline={false} width={1} />
          </mesh>
        </group>
      </PopUp>

      {/* 도르래와 받침쇠 */}
      <PopUp at={0.16}>
        {[-0.012, 0.012].map((side) => (
          <mesh
            key={side}
            position={[(BENCH.right - 0.03 + PULLEY.x + 0.008) / 2, PULLEY.y, Z + side]}
            material={inkMaterial(TINT.steel)}
            castShadow
          >
            <boxGeometry args={[PULLEY.x + 0.008 - (BENCH.right - 0.03), 0.012, 0.004]} />
            <InkLines width={1} />
          </mesh>
        ))}
        <group ref={wheel} position={[PULLEY.x, PULLEY.y, Z]}>
          <mesh rotation-x={Math.PI / 2} material={inkMaterial(TINT.brass)} castShadow>
            <cylinderGeometry args={[PULLEY.radius, PULLEY.radius, 0.014, 28]} />
            <InkLines width={1.2} />
          </mesh>
          {/* 도는 것이 보이도록 바퀴살을 그린다. */}
          {[0, Math.PI / 2].map((turn) => (
            <mesh key={turn} rotation-z={turn}>
              <boxGeometry args={[PULLEY.radius * 1.7, 0.0034, 0.0156]} />
              <meshBasicMaterial color={COLORS.ink} />
            </mesh>
          ))}
        </group>
        <primitive object={rope.mesh} />
      </PopUp>

      {/* 수레: 남은 추와 벽돌을 싣는다. */}
      <PopUp at={0.24} span={0.26}>
        <group ref={cart} position={[CART_START, 0, Z]}>
          <Cart setup={setup} />
        </group>
      </PopUp>

      {/* 추걸이와 받침 */}
      <PopUp at={0.3} span={0.26}>
        <mesh
          position={[DROP_X, PAD_TOP / 2, Z]}
          material={inkMaterial(TINT.red)}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.1, PAD_TOP, 0.1]} />
          <InkLines />
        </mesh>
        <group ref={hanger} position={[DROP_X, PAD_TOP + PULL_DISTANCE * METER, Z]}>
          <mesh position={[0, 0.0025, 0]} material={inkMaterial(TINT.steel)} castShadow>
            <cylinderGeometry args={[0.027, 0.027, 0.005, 24]} />
            <InkLines width={1} />
          </mesh>
          <mesh position={[0, HANGER_TOP / 2, 0]}>
            <cylinderGeometry args={[0.003, 0.003, HANGER_TOP, 8]} />
            <meshBasicMaterial color={COLORS.ink} />
          </mesh>
          {Array.from({ length: setup.weights }, (_, index) => (
            <mesh
              key={index}
              position={[0, 0.005 + 0.014 * (index + 0.5), 0]}
              material={inkMaterial(TINT.brass)}
              castShadow
            >
              <cylinderGeometry args={[0.024, 0.024, 0.014, 24]} />
              <InkLines width={1.1} />
            </mesh>
          ))}
        </group>
      </PopUp>

      {/* 칠판: 속력–시간 그래프와 기록표 */}
      <PopUp at={0.36} span={0.3}>
        {[-0.41, 0.41].map((x) => (
          <mesh
            key={x}
            position={[x, (BOARD_BOTTOM + 0.04) / 2, BOARD_Z - 0.016]}
            material={inkMaterial(TINT.woodDark)}
            castShadow
          >
            <boxGeometry args={[0.02, BOARD_BOTTOM + 0.04, 0.02]} />
            <InkLines />
          </mesh>
        ))}
        <group position={[0, BOARD_BOTTOM, BOARD_Z]} rotation-x={-BOARD_TILT}>
          <group position={[0, BOARD.height / 2, 0]}>
            <mesh position={[0, 0, -0.008]} material={inkMaterial(TINT.wood)} castShadow>
              <boxGeometry args={[BOARD.width + 0.03, BOARD.height + 0.03, 0.014]} />
              <InkLines />
            </mesh>
            <mesh>
              <planeGeometry args={[BOARD.width, BOARD.height]} />
              <meshBasicMaterial map={boardTexture} toneMapped={false} />
            </mesh>
            <mesh ref={pullLine} geometry={lineGeometry} visible={false}>
              <meshBasicMaterial color={lineColorOf(setup)} toneMapped={false} />
            </mesh>
            <mesh ref={coastLine} geometry={lineGeometry} visible={false}>
              <meshBasicMaterial color={lineColorOf(setup)} toneMapped={false} />
            </mesh>
            <group ref={marker} visible={false}>
              <mesh>
                <circleGeometry args={[0.009, 20]} />
                <meshBasicMaterial color="#fffbe6" toneMapped={false} />
              </mesh>
              <Glow color={lineColorOf(setup)} size={0.11} opacity={0.85} />
            </group>
          </group>
        </group>
      </PopUp>

      {/* 끄는 힘(추가 끄는 동안만)과 부딪힐 때 서로 미는 힘 */}
      <PushArrow
        getValue={() => arrows.current.force}
        scale={0.052}
        getOrigin={() => [arrows.current.cartX + CART.length / 2 + 0.012, STRING_Y + 0.045, Z]}
        color={TINT.accent}
      />
      <PushArrow
        getValue={() => arrows.current.push}
        scale={1}
        getOrigin={() => [BUMPER_X + 0.014, TRACK_TOP + 0.1, Z]}
        color={TINT.orange}
      />
      <PushArrow
        getValue={() => -arrows.current.push}
        scale={1}
        getOrigin={() => [BUMPER_X - 0.014, TRACK_TOP + 0.1, Z]}
        color={TINT.blue}
      />
      {(step === 'stop' || step === 'result') && (
        <>
          <Label
            text="범퍼가 미는 힘"
            height={0.034}
            color={COLORS.pencil}
            position={[BUMPER_X - 0.13, TRACK_TOP + 0.148, Z + 0.02]}
          />
          <Label
            text="수레가 미는 힘"
            height={0.034}
            color={COLORS.accent}
            position={[BUMPER_X + 0.13, TRACK_TOP + 0.148, Z + 0.02]}
          />
        </>
      )}

      {/* 지금 일어나는 일을 알리는 꼬리표: 실험대 앞, 단추 위 */}
      <PopUp at={0.62} mode="grow" span={0.18} position={[-0.03, 0.04, 0.125]}>
        <Label text={banner.text} tag={banner.tag} height={0.05} />
      </PopUp>

      <primitive object={impact.group} />
      <primitive object={sparkles.points} />

      <SceneButton
        id="start"
        label={
          step === 'ready' ? '출발' : step === 'pull' || step === 'coast' ? '멈춤' : '다시 출발'
        }
        position={[columns[0], 0, rows[0]]}
        width={0.2}
        active={step === 'ready'}
        onPress={start}
      />
      {([1, 2, 3] as const).map((count) => (
        <SceneButton
          key={count}
          id={`weights-${count}`}
          label={`추 ${count}개`}
          position={[columns[count], 0, rows[0]]}
          width={0.185}
          active={setup.weights === count}
          onPress={pickWeights(count)}
          at={0.8 + count * 0.02}
        />
      ))}
      <SceneButton
        id="clear"
        label="기록 지우기"
        position={[columns[0], 0, rows[1]]}
        width={0.2}
        disabled={records.length === 0}
        onPress={clear}
        at={0.84}
      />
      {([0, 1, 2] as const).map((count) => (
        <SceneButton
          key={count}
          id={`bricks-${count}`}
          label={`벽돌 ${count}개`}
          position={[columns[count + 1] ?? 0, 0, rows[1]]}
          width={0.185}
          active={setup.bricks === count}
          onPress={pickBricks(count)}
          at={0.86 + count * 0.02}
        />
      ))}
    </group>
  );
}

/** 수레: 몸통, 바퀴, 줄을 거는 고리, 추걸이에 걸지 않은 추, 벽돌 */
function Cart({ setup }: { setup: Setup }) {
  const bodyTop = TRACK_TOP + 0.012 + CART.height;
  return (
    <>
      <mesh
        position={[0, bodyTop - CART.height / 2, 0]}
        material={inkMaterial(TINT.orange)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[CART.length, CART.height, CART.depth]} />
        <InkLines />
      </mesh>
      {[-0.034, 0.034].flatMap((x) =>
        [-1, 1].map((side) => (
          <mesh
            key={`${x}${side}`}
            position={[x, TRACK_TOP + CART.wheel, side * (CART.depth / 2 + 0.003)]}
            rotation-x={Math.PI / 2}
            material={inkMaterial(TINT.steel)}
          >
            <cylinderGeometry args={[CART.wheel, CART.wheel, 0.008, 18]} />
            <InkLines width={1} />
          </mesh>
        )),
      )}
      <mesh position={[CART.length / 2 + 0.003, STRING_Y, 0]} rotation-y={Math.PI / 2}>
        <torusGeometry args={[0.006, 0.0016, 6, 14]} />
        <meshBasicMaterial color={COLORS.ink} />
      </mesh>
      {/* 추걸이로 옮기지 않은 추는 수레 뒤쪽 꽂이에 쌓여 있다. */}
      <mesh position={[-0.036, bodyTop + 0.022, 0]}>
        <cylinderGeometry args={[0.0022, 0.0022, 0.044, 6]} />
        <meshBasicMaterial color={COLORS.ink} />
      </mesh>
      {Array.from({ length: 3 - setup.weights }, (_, index) => (
        <mesh
          key={index}
          position={[-0.036, bodyTop + 0.012 * (index + 0.5), 0]}
          material={inkMaterial(TINT.brass)}
          castShadow
        >
          <cylinderGeometry args={[0.016, 0.016, 0.012, 20]} />
          <InkLines width={1} />
        </mesh>
      ))}
      {Array.from({ length: setup.bricks }, (_, index) => (
        <mesh
          key={index}
          position={[0.016, bodyTop + 0.026 * (index + 0.5), 0]}
          material={inkMaterial(TINT.red)}
          castShadow
        >
          <boxGeometry args={[0.058, 0.026, 0.052]} />
          <InkLines />
        </mesh>
      ))}
    </>
  );
}
