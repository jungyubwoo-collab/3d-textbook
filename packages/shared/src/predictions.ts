import { z } from 'zod';

/** 레슨·문항·보기 ID. 소문자와 숫자를 하이픈으로 잇는다. 예: `lever`, `balance`, `one` */
export const contentIdSchema = z
  .string()
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '소문자, 숫자, 하이픈만 쓸 수 있습니다.');

/** POST /api/predictions 요청 본문: 학생이 덮개를 열 때 고른 예측 */
export const createPredictionSchema = z.object({
  /** 브라우저에서 만든 익명 학습자 ID (로그인 없음) */
  learnerId: z.uuid(),
  lessonId: contentIdSchema,
  questionId: contentIdSchema,
  choiceId: contentIdSchema,
  isCorrect: z.boolean(),
});
export type CreatePredictionInput = z.infer<typeof createPredictionSchema>;

/** GET /api/predictions/stats 쿼리 */
export const predictionStatsQuerySchema = z.object({
  lessonId: contentIdSchema,
  questionId: contentIdSchema,
});
export type PredictionStatsQuery = z.infer<typeof predictionStatsQuerySchema>;

export interface PredictionResponse extends CreatePredictionInput {
  id: string;
  /** ISO 8601 */
  createdAt: string;
}

/** 한 문항에 대한 전체 학생의 예측 통계 */
export interface PredictionStats extends PredictionStatsQuery {
  total: number;
  correct: number;
  /** 보기 ID별 선택 수 */
  choices: Record<string, number>;
}
