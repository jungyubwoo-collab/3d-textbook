export type CollisionKind = 'stick' | 'bounce';

/** 운동량(kg·m/s) = 질량(kg) × 속도(m/s) */
export function momentum(mass: number, velocity: number): number {
  return mass * velocity;
}

/**
 * 일직선 위 두 수레의 충돌 뒤 속도.
 * - stick: 붙어서 함께 움직인다(완전 비탄성 충돌).
 * - bounce: 용수철로 튕긴다(탄성 충돌, 운동 에너지도 보존).
 * 어느 쪽이든 운동량의 합은 그대로다.
 */
export function collide(
  m1: number,
  v1: number,
  m2: number,
  v2: number,
  kind: CollisionKind,
): [number, number] {
  if (kind === 'stick') {
    const v = (m1 * v1 + m2 * v2) / (m1 + m2);
    return [v, v];
  }
  return [((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2), ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2)];
}
