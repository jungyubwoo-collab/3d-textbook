import type { Matrix4 } from 'three';

/**
 * 월드 행렬이 세로(월드 y)로 얼마나 눌렸는지: 1이면 그대로, 0에 가까울수록 납작하다.
 * 팝업 장면은 일어서기 전과 책장을 넘기는 동안 월드 y 방향으로만 눌린다.
 * 행렬의 y 행 길이를 x·z 행 길이와 비교하면, 물체가 돌아가 있어도 눌린 정도가 나온다.
 */
export function verticalSquash(matrix: Matrix4): number {
  const e = (index: number) => matrix.elements[index] ?? 0;
  const rowX = Math.hypot(e(0), e(4), e(8));
  const rowY = Math.hypot(e(1), e(5), e(9));
  const rowZ = Math.hypot(e(2), e(6), e(10));
  const reference = Math.max(rowX, rowZ);
  return reference > 0 ? rowY / reference : 1;
}
