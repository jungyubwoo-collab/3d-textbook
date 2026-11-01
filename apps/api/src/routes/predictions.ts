import {
  createPredictionSchema,
  predictionStatsQuerySchema,
  type PredictionResponse,
  type PredictionStats,
} from '@3d-textbook/shared';
import { Router } from 'express';
import type { PrismaClient } from '../db.ts';
import type { Prediction } from '../generated/prisma/client.ts';

export function predictionsRouter(prisma: PrismaClient): Router {
  const router = Router();

  // 학생이 덮개를 열 때 고른 예측을 남긴다. 같은 문항은 첫 예측만 유지한다.
  router.post('/', async (req, res) => {
    const input = createPredictionSchema.parse(req.body);
    try {
      const created = await prisma.prediction.create({ data: input });
      res.status(201).json(toResponse(created));
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const existing = await prisma.prediction.findUniqueOrThrow({
        where: {
          learnerId_lessonId_questionId: {
            learnerId: input.learnerId,
            lessonId: input.lessonId,
            questionId: input.questionId,
          },
        },
      });
      res.status(200).json(toResponse(existing));
    }
  });

  // 문항별로 몇 명이 예측했고 그중 몇 명이 맞혔는지
  router.get('/stats', async (req, res) => {
    const { lessonId, questionId } = predictionStatsQuerySchema.parse(req.query);
    const groups = await prisma.prediction.groupBy({
      by: ['choiceId', 'isCorrect'],
      where: { lessonId, questionId },
      _count: { _all: true },
    });

    const body: PredictionStats = { lessonId, questionId, total: 0, correct: 0, choices: {} };
    for (const group of groups) {
      const count = group._count._all;
      body.total += count;
      if (group.isCorrect) body.correct += count;
      body.choices[group.choiceId] = (body.choices[group.choiceId] ?? 0) + count;
    }
    res.json(body);
  });

  return router;
}

function toResponse(prediction: Prediction): PredictionResponse {
  return { ...prediction, createdAt: prediction.createdAt.toISOString() };
}

/** Prisma의 고유 제약 위반(P2002) */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
