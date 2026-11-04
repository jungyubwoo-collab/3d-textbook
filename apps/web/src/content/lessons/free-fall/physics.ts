import { GRAVITY } from '../physics.ts';

/** 유리관 길이(m). 물체는 이만큼 떨어진다. */
export const TUBE_LENGTH = 1;
/** 공기 속 깃털의 종단 속력(m/s). 공기 저항이 커서 금방 이 속력으로 일정하게 떨어진다. */
export const FEATHER_TERMINAL_SPEED = 0.5;
/** 공기 속 쇠구슬의 종단 속력(m/s). 1 m 정도에서는 거의 자유 낙하와 같다. */
export const BALL_TERMINAL_SPEED = 60;

/**
 * t초 동안 떨어진 거리(m). terminalSpeed를 주면 속력에 비례하는 공기 저항을 받는다.
 * 저항이 없으면 h = ½gt².
 */
export function fallDistance(t: number, terminalSpeed?: number, g = GRAVITY): number {
  if (t <= 0) return 0;
  if (!terminalSpeed) return 0.5 * g * t * t;
  const tau = terminalSpeed / g;
  return terminalSpeed * (t - tau * (1 - Math.exp(-t / tau)));
}

/** t초 뒤의 속력(m/s). 저항이 없으면 v = gt. */
export function fallSpeed(t: number, terminalSpeed?: number, g = GRAVITY): number {
  if (t <= 0) return 0;
  if (!terminalSpeed) return g * t;
  return terminalSpeed * (1 - Math.exp((-g * t) / terminalSpeed));
}

/** height(m)를 떨어지는 데 걸리는 시간(초) */
export function timeToFall(height: number, terminalSpeed?: number, g = GRAVITY): number {
  if (!terminalSpeed) return Math.sqrt((2 * height) / g);
  let low = 0;
  let high = height / terminalSpeed + (10 * terminalSpeed) / g + 1;
  for (let i = 0; i < 60; i++) {
    const middle = (low + high) / 2;
    if (fallDistance(middle, terminalSpeed, g) < height) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}
