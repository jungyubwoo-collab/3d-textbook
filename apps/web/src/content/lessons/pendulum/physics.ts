import { GRAVITY } from '../physics.ts';

export interface PendulumConfig {
  /** 줄 길이(m) */
  length: number;
  /** 못이 받침점 아래 얼마나 깊이 있는지(m). null이면 못이 없다. */
  pegDepth: number | null;
  g?: number;
}

/**
 * 진자의 상태. 각도는 연직 아래 방향에서 잰 값(라디안, 오른쪽이 +).
 * 줄이 못에 걸린 동안(side = 'peg')은 못을 중심으로 짧아진 줄로 돈다.
 */
export interface PendulumState {
  side: 'free' | 'peg';
  angle: number;
  velocity: number;
}

export function releasedAt(angle: number): PendulumState {
  return { side: 'free', angle, velocity: 0 };
}

function radiusOf(state: PendulumState, config: PendulumConfig): number {
  return state.side === 'peg' && config.pegDepth !== null
    ? config.length - config.pegDepth
    : config.length;
}

/**
 * dt초만큼 진자를 움직인다. 짧은 걸음으로 나눠 반-암시적 오일러로 적분한다.
 * 맨 아래를 지나 오른쪽으로 갈 때 줄이 못에 걸리고, 돌아올 때 풀린다.
 * 걸리거나 풀릴 때는 추의 속력(선속도)이 그대로 이어진다.
 */
export function stepPendulum(
  state: PendulumState,
  dt: number,
  config: PendulumConfig,
): PendulumState {
  const g = config.g ?? GRAVITY;
  const { length, pegDepth } = config;
  let { side, angle, velocity } = state;
  const steps = Math.max(1, Math.ceil(dt / 0.0005));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const radius = side === 'peg' && pegDepth !== null ? length - pegDepth : length;
    velocity += -(g / radius) * Math.sin(angle) * h;
    const next = angle + velocity * h;
    if (pegDepth !== null && side === 'free' && angle <= 0 && next > 0) {
      const short = length - pegDepth;
      side = 'peg';
      velocity *= length / short;
      angle = (next * length) / short;
    } else if (side === 'peg' && pegDepth !== null && angle >= 0 && next < 0) {
      const short = length - pegDepth;
      side = 'free';
      velocity *= short / length;
      angle = (next * short) / length;
    } else {
      angle = next;
    }
  }
  return { side, angle, velocity };
}

/** 받침점을 원점으로 한 추의 위치(m). y는 위가 +이다. */
export function bobPosition(
  state: PendulumState,
  config: PendulumConfig,
): { x: number; y: number } {
  if (state.side === 'peg' && config.pegDepth !== null) {
    const radius = config.length - config.pegDepth;
    return {
      x: radius * Math.sin(state.angle),
      y: -config.pegDepth - radius * Math.cos(state.angle),
    };
  }
  return { x: config.length * Math.sin(state.angle), y: -config.length * Math.cos(state.angle) };
}

/** 가장 낮은 곳에서 잰 추의 높이(m) */
export function heightOf(state: PendulumState, config: PendulumConfig): number {
  return bobPosition(state, config).y + config.length;
}

/** 추의 속력(m/s) */
export function speedOf(state: PendulumState, config: PendulumConfig): number {
  return Math.abs(state.velocity) * radiusOf(state, config);
}

/** 질량 1 kg 기준의 위치·운동 에너지(J) */
export function energiesOf(
  state: PendulumState,
  config: PendulumConfig,
): { potential: number; kinetic: number } {
  const g = config.g ?? GRAVITY;
  const speed = speedOf(state, config);
  return { potential: g * heightOf(state, config), kinetic: 0.5 * speed * speed };
}
