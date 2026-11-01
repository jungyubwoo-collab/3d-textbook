import { pino } from 'pino';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from './app.ts';
import type { PrismaClient } from './db.ts';

const logger = pino({ level: 'silent' });

const prediction = {
  learnerId: '0195f4b2-7c1e-7a3b-9c2d-3e4f5a6b7c8d',
  lessonId: 'lever',
  questionId: 'balance',
  choiceId: 'one',
  isCorrect: true,
};

const stored = {
  ...prediction,
  id: '0195f4b2-0000-7000-8000-000000000001',
  createdAt: new Date('2026-11-01T00:00:00.000Z'),
};

function createFakePrisma() {
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]),
    prediction: {
      create: vi.fn().mockResolvedValue(stored),
      findUniqueOrThrow: vi.fn().mockResolvedValue(stored),
      groupBy: vi.fn().mockResolvedValue([]),
    },
  };
}

let prisma: ReturnType<typeof createFakePrisma>;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  prisma = createFakePrisma();
  app = createApp({ prisma: prisma as unknown as PrismaClient, logger });
});

describe('GET /api/health', () => {
  it('reports ok when the database answers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'ok' });
  });

  it('reports degraded when the database is unreachable', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: 'degraded', database: 'unreachable' });
  });
});

describe('POST /api/predictions', () => {
  it('stores a new prediction', async () => {
    const res = await request(app).post('/api/predictions').send(prediction);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      ...prediction,
      id: stored.id,
      createdAt: '2026-11-01T00:00:00.000Z',
    });
    expect(prisma.prediction.create).toHaveBeenCalledWith({ data: prediction });
  });

  it('keeps the first prediction when the learner answers again', async () => {
    prisma.prediction.create.mockRejectedValueOnce(
      Object.assign(new Error('dup'), { code: 'P2002' }),
    );
    const res = await request(app)
      .post('/api/predictions')
      .send({ ...prediction, choiceId: 'two', isCorrect: false });
    expect(res.status).toBe(200);
    expect(res.body.choiceId).toBe('one');
  });

  it('rejects an invalid body', async () => {
    const res = await request(app)
      .post('/api/predictions')
      .send({ ...prediction, learnerId: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_request');
    expect(prisma.prediction.create).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON', async () => {
    const res = await request(app)
      .post('/api/predictions')
      .set('Content-Type', 'application/json')
      .send('{"learnerId":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('bad_request');
  });

  it('turns unexpected failures into a 500', async () => {
    prisma.prediction.create.mockRejectedValueOnce(new Error('disk full'));
    const res = await request(app).post('/api/predictions').send(prediction);
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('internal_error');
  });
});

describe('GET /api/predictions/stats', () => {
  it('aggregates predictions per choice', async () => {
    prisma.prediction.groupBy.mockResolvedValueOnce([
      { choiceId: 'one', isCorrect: true, _count: { _all: 3 } },
      { choiceId: 'two', isCorrect: false, _count: { _all: 2 } },
      { choiceId: 'four', isCorrect: false, _count: { _all: 1 } },
    ]);
    const res = await request(app).get('/api/predictions/stats?lessonId=lever&questionId=balance');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      lessonId: 'lever',
      questionId: 'balance',
      total: 6,
      correct: 3,
      choices: { one: 3, two: 2, four: 1 },
    });
  });

  it('requires lessonId and questionId', async () => {
    const res = await request(app).get('/api/predictions/stats?lessonId=lever');
    expect(res.status).toBe(400);
  });
});

it('answers unknown routes with a JSON 404', async () => {
  const res = await request(app).get('/api/nope');
  expect(res.status).toBe(404);
  expect(res.body.error.code).toBe('not_found');
});
