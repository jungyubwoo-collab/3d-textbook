import type { CreatePredictionInput, PredictionStats } from '@3d-textbook/shared';

/** 개발 중에는 Vite가 /api 를 API 서버로 넘긴다(vite.config.ts). 배포 때는 같은 주소에 API를 둔다. */
const API_BASE = '/api';

/**
 * 예측을 서버에 남기고 그 문항의 전체 통계를 받아 온다.
 * API 서버가 없거나 실패해도 책은 그대로 동작해야 하므로 오류 대신 null을 돌려준다.
 */
export async function recordPrediction(
  input: CreatePredictionInput,
): Promise<PredictionStats | null> {
  try {
    const saved = await fetch(`${API_BASE}/predictions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!saved.ok) return null;
    const query = new URLSearchParams({ lessonId: input.lessonId, questionId: input.questionId });
    const stats = await fetch(`${API_BASE}/predictions/stats?${query.toString()}`);
    if (!stats.ok) return null;
    const body: PredictionStats = await stats.json();
    return body;
  } catch {
    return null;
  }
}

export function describeStats(stats: PredictionStats): string {
  if (stats.total <= 1) return '첫 번째 예측으로 기록되었어요.';
  const percent = Math.round((stats.correct / stats.total) * 100);
  return `지금까지 ${stats.total}명 중 ${percent}%가 정답을 예측했어요.`;
}
