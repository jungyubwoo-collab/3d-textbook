import { GRAVITY } from '../physics.ts';

/** 중력에 의한 위치 에너지(J) = 질량(kg) × 중력 가속도 × 높이(m) */
export function potentialEnergy(mass: number, height: number, g = GRAVITY): number {
  return mass * g * height;
}

/** 상자를 올릴 수 있는 높이(m) */
export const HEIGHTS = [0, 1, 2, 3] as const;
/** 고를 수 있는 상자 질량(kg) */
export const MASSES = [1, 2] as const;
