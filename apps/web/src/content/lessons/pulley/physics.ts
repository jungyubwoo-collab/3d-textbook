/**
 * 도르래와 일의 원리.
 * 무게 10 N인 물체를 0.4 m 들어 올린다. 줄과 도르래의 무게, 마찰은 무시한다.
 * 움직도르래를 쓰면 물체를 여러 가닥의 줄이 나눠 들어 힘이 줄지만, 그 가닥들이 모두 짧아져야 하므로
 * 줄을 그만큼 더 길게 당겨야 한다. 그래서 힘 × 당긴 거리(일)는 어떤 도르래를 써도 같다.
 */

/** 물체의 무게(N) */
export const LOAD_WEIGHT = 10;
/** 들어 올리는 높이(m) */
export const LIFT_HEIGHT = 0.4;

/** 움직도르래의 개수. 0이면 고정 도르래만 쓴다. */
export type Movable = 0 | 1 | 2;
export const RIGS: readonly Movable[] = [0, 1, 2];

/** 물체를 나눠 드는 줄의 가닥 수 */
export function strandsOf(movable: Movable): number {
  return movable === 0 ? 1 : movable * 2;
}

/** 줄을 당기는 힘(N) = 무게 ÷ 가닥 수 */
export function pullForce(movable: Movable): number {
  return LOAD_WEIGHT / strandsOf(movable);
}

/** 물체를 height(m)만큼 올리려면 당겨야 하는 줄의 길이(m) = 높이 × 가닥 수 */
export function ropeFor(movable: Movable, height: number): number {
  return height * strandsOf(movable);
}

/** 줄을 pulled(m)만큼 당겼을 때 물체가 올라간 높이(m). 다 올라가면 멈춘다. */
export function heightFor(movable: Movable, pulled: number): number {
  return Math.min(LIFT_HEIGHT, Math.max(0, pulled) / strandsOf(movable));
}

/** 일(J) = 힘(N) × 힘의 방향으로 움직인 거리(m) */
export function work(force: number, distance: number): number {
  return force * distance;
}

/** 물체가 얻은 위치 에너지(J) = 무게 × 올라간 높이 */
export function energyGained(height: number): number {
  return LOAD_WEIGHT * height;
}

/** 끝까지 들어 올렸을 때의 기록 */
export interface Lift {
  movable: Movable;
  strands: number;
  /** 당기는 힘(N) */
  force: number;
  /** 당긴 줄의 길이(m) */
  distance: number;
  /** 한 일(J) */
  work: number;
}

export function liftOf(movable: Movable): Lift {
  const force = pullForce(movable);
  const distance = ropeFor(movable, LIFT_HEIGHT);
  return { movable, strands: strandsOf(movable), force, distance, work: work(force, distance) };
}

/** 도르래의 이름 */
export function rigName(movable: Movable): string {
  return movable === 0 ? '고정 도르래' : `움직도르래 ${movable}개`;
}

/** 숫자를 짧게 쓴다(2.5 → "2.5", 10 → "10"). */
export function short(value: number): string {
  return String(Math.round(value * 100) / 100);
}
