import { GRAVITY } from '../physics.ts';

/** 운동 에너지(J) = ½ × 질량(kg) × 속력(m/s)² */
export function kineticEnergy(mass: number, speed: number): number {
  return 0.5 * mass * speed * speed;
}

/** 나무토막과 바닥 사이의 마찰 계수 */
export const FRICTION = 0.5;

/** 속력 speed로 밀려난 나무토막이 마찰 때문에 멈출 때까지 미끄러지는 거리(m) */
export function slideDistance(speed: number, friction = FRICTION, g = GRAVITY): number {
  return (speed * speed) / (2 * friction * g);
}

/** 미끄러지기 시작해서 멈출 때까지 걸리는 시간(초) */
export function slideTime(speed: number, friction = FRICTION, g = GRAVITY): number {
  return speed / (friction * g);
}

/** 고를 수 있는 수레 속력(m/s) */
export const SPEEDS = [1, 1.5, 2] as const;
