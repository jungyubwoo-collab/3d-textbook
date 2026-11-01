/** 고리 위치(받침점에서 몇 칸, 왼쪽은 음수)와 그 고리에 건 추의 개수 */
export interface Hanging {
  position: number;
  count: number;
}

/** 돌림힘의 합(추 1개 × 1칸 = 1). 양수면 오른쪽이 무겁다. */
export function netTorque(hangings: Hanging[]): number {
  return hangings.reduce((sum, { position, count }) => sum + position * count, 0);
}

export const MAX_TILT = 0.22;
const TILT_PER_UNIT = 0.035;

/** 막대가 기우는 각도(라디안). 오른쪽이 무거우면 시계 방향(음수)으로 기운다. */
export function tiltAngle(torque: number): number {
  return -Math.max(-MAX_TILT, Math.min(MAX_TILT, torque * TILT_PER_UNIT));
}

/** 오른쪽 고리별 추 개수 배열([1칸, 2칸, 3칸, 4칸])을 Hanging 목록으로 바꾼다. */
export function rightSide(counts: readonly number[]): Hanging[] {
  return counts.map((count, index) => ({ position: index + 1, count }));
}
