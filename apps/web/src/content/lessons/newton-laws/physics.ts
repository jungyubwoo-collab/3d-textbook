import { GRAVITY } from '../physics.ts';

/**
 * 수레와 추 실험(뉴턴의 운동 법칙).
 * 수평 레일 위의 수레를, 도르래에 걸친 줄 끝의 추가 끈다. 마찰과 줄·도르래의 질량은 무시한다.
 * 추는 모두 3개이고, 추걸이에 걸지 않은 추는 수레에 싣는다. 그래서 추를 옮겨 끄는 힘을 바꿔도
 * 함께 움직이는 전체 질량은 그대로다(한 가지 조건만 바꾸는 실험).
 */

/** 추 하나의 질량(kg) */
export const WEIGHT_MASS = 0.1;
/** 추 하나의 무게(N) */
export const WEIGHT_FORCE = WEIGHT_MASS * GRAVITY;
/** 수레(0.7 kg)에 추 3개(0.1 kg씩)를 합친 질량(kg) */
export const BASE_MASS = 1;
/** 벽돌 하나의 질량(kg) */
export const BRICK_MASS = 1;
/** 추가 바닥에 닿을 때까지 떨어지는 거리(m). 그동안 수레가 끌려간다. */
export const PULL_DISTANCE = 0.6;
/** 추가 닿은 뒤 범퍼까지 남은 거리(m) */
export const COAST_DISTANCE = 0.7;
/** 기록 테이프에 점을 찍는 시간 간격(s) */
export const TICK = 0.1;

export type Weights = 1 | 2 | 3;
export type Bricks = 0 | 1 | 2;

/** 실험 조건: 추걸이에 건 추의 개수(끄는 힘)와 수레에 올린 벽돌의 개수(질량) */
export interface Setup {
  weights: Weights;
  bricks: Bricks;
}

/** 끄는 힘(N) = 추걸이에 건 추의 무게 */
export function pullForce(setup: Setup): number {
  return setup.weights * WEIGHT_FORCE;
}

/** 함께 움직이는 전체 질량(kg) = 수레 + 추 3개 + 벽돌 */
export function totalMass(setup: Setup): number {
  return BASE_MASS + setup.bricks * BRICK_MASS;
}

/** 가속도(m/s²) = 힘 ÷ 질량 (제2법칙) */
export function acceleration(setup: Setup): number {
  return pullForce(setup) / totalMass(setup);
}

/** 한 번의 실험에서 일어나는 일 */
export interface Run {
  setup: Setup;
  force: number;
  mass: number;
  /** 추가 끄는 동안의 가속도(m/s²) */
  a: number;
  /** 추가 바닥에 닿는 시각(s). 이때부터 끄는 힘이 0이다. */
  landAt: number;
  /** 추가 닿는 순간의 속력(m/s). 그 뒤로는 이 속력 그대로 간다(제1법칙). */
  topSpeed: number;
  /** 수레가 범퍼에 닿는 시각(s) */
  hitAt: number;
}

export function planRun(setup: Setup): Run {
  const a = acceleration(setup);
  const landAt = Math.sqrt((2 * PULL_DISTANCE) / a);
  const topSpeed = a * landAt;
  return {
    setup,
    force: pullForce(setup),
    mass: totalMass(setup),
    a,
    landAt,
    topSpeed,
    hitAt: landAt + COAST_DISTANCE / topSpeed,
  };
}

/** pull: 추가 끄는 중, coast: 끄는 힘 없이 가는 중, stop: 범퍼에 닿아 멈춤 */
export type Phase = 'pull' | 'coast' | 'stop';

export interface CartState {
  phase: Phase;
  /** 출발점에서 간 거리(m) */
  distance: number;
  /** 속력(m/s) */
  speed: number;
}

/** 출발한 지 t초 뒤 수레의 상태 */
export function cartAt(run: Run, t: number): CartState {
  if (t <= 0) return { phase: 'pull', distance: 0, speed: 0 };
  if (t < run.landAt) return { phase: 'pull', distance: 0.5 * run.a * t * t, speed: run.a * t };
  if (t < run.hitAt) {
    return {
      phase: 'coast',
      distance: PULL_DISTANCE + run.topSpeed * (t - run.landAt),
      speed: run.topSpeed,
    };
  }
  return { phase: 'stop', distance: PULL_DISTANCE + COAST_DISTANCE, speed: 0 };
}

/** 기록 테이프의 점: TICK초마다 수레가 있던 자리(범퍼에 닿기 전까지) */
export function tapeDots(run: Run): { distance: number; phase: Phase }[] {
  const dots: { distance: number; phase: Phase }[] = [];
  for (let i = 0; i * TICK < run.hitAt; i++) {
    const { distance, phase } = cartAt(run, i * TICK);
    dots.push({ distance, phase });
  }
  return dots;
}

export const sameSetup = (a: Setup, b: Setup): boolean =>
  a.weights === b.weights && a.bricks === b.bricks;

/** 기록표에 남기는 실험의 최대 개수 */
export const MAX_RECORDS = 4;

/** 기록을 더한다. 같은 조건은 한 번만 남기고(가장 최근 것을 뒤로), 오래된 것부터 밀려난다. */
export function addRecord(records: Setup[], setup: Setup): Setup[] {
  return [...records.filter((record) => !sameSetup(record, setup)), setup].slice(-MAX_RECORDS);
}

/** 몇 배인지를 읽기 좋게 쓴다(2 → "2배", 0.5 → "1/2배"). */
export function timesText(ratio: number): string {
  for (const whole of [1, 2, 3]) {
    if (Math.abs(ratio - whole) < 1e-6) return `${whole}배`;
    if (Math.abs(ratio * whole - 1) < 1e-6) return `1/${whole}배`;
  }
  if (Math.abs(ratio - 1.5) < 1e-6) return '1.5배';
  if (Math.abs(ratio * 1.5 - 1) < 1e-6) return '2/3배';
  return `${ratio.toFixed(2)}배`;
}

/**
 * 앞선 기록과 견주어 알 수 있는 사실. 한 가지 조건만 다른 기록이 있을 때만 말해 준다
 * (가장 최근 기록부터 찾는다). 힘만 다르면 가속도는 힘에 비례하고, 질량만 다르면 반비례한다.
 */
export function insightOf(setup: Setup, earlier: Setup[]): string | null {
  for (const other of earlier.toReversed()) {
    if (other.bricks === setup.bricks && other.weights !== setup.weights) {
      const ratio = pullForce(setup) / pullForce(other);
      return `힘이 ${timesText(ratio)} → 가속도도 ${timesText(ratio)}`;
    }
    if (other.weights === setup.weights && other.bricks !== setup.bricks) {
      const ratio = totalMass(setup) / totalMass(other);
      return `질량이 ${timesText(ratio)} → 가속도는 ${timesText(1 / ratio)}`;
    }
  }
  return null;
}

/**
 * 탐구 과제를 했는지: ① 한 번 기록하기 ② 힘만 바꿔 견주기 ③ 질량만 바꿔 견주기
 */
export function missionsOf(records: Setup[]): [boolean, boolean, boolean] {
  const pairs = records.flatMap((a, i) => records.slice(i + 1).map((b) => [a, b] as const));
  return [
    records.length > 0,
    pairs.some(([a, b]) => a.bricks === b.bricks && a.weights !== b.weights),
    pairs.some(([a, b]) => a.weights === b.weights && a.bricks !== b.bricks),
  ];
}
