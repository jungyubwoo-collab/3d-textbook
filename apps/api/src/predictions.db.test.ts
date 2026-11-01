import { randomUUID } from 'node:crypto';
import { pino } from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.ts';
import { createPrismaClient, type PrismaClient } from './db.ts';

// 실제 PostgreSQL에 붙는 통합 테스트. TEST_DATABASE_URL이 있을 때만 실행한다(CI에서는 항상 실행).
const databaseUrl = process.env['TEST_DATABASE_URL'];

describe.skipIf(!databaseUrl)('predictions against PostgreSQL', () => {
  const lessonId = `test-${randomUUID().slice(0, 8)}`;
  let prisma: PrismaClient;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    prisma = createPrismaClient(databaseUrl!);
    app = createApp({ prisma, logger: pino({ level: 'silent' }) });
  });

  afterAll(async () => {
    await prisma.prediction.deleteMany({ where: { lessonId } });
    await prisma.$disconnect();
  });

  it('keeps each learner’s first prediction and aggregates stats', async () => {
    const alice = randomUUID();
    const bob = randomUUID();
    const base = { lessonId, questionId: 'balance' };

    const first = await request(app)
      .post('/api/predictions')
      .send({ ...base, learnerId: alice, choiceId: 'one', isCorrect: true });
    expect(first.status).toBe(201);

    const again = await request(app)
      .post('/api/predictions')
      .send({ ...base, learnerId: alice, choiceId: 'two', isCorrect: false });
    expect(again.status).toBe(200);
    expect(again.body.id).toBe(first.body.id);
    expect(again.body.choiceId).toBe('one');

    await request(app)
      .post('/api/predictions')
      .send({ ...base, learnerId: bob, choiceId: 'four', isCorrect: false })
      .expect(201);

    const stats = await request(app).get('/api/predictions/stats').query(base).expect(200);
    expect(stats.body).toEqual({ ...base, total: 2, correct: 1, choices: { one: 1, four: 1 } });
  });

  it('reports a healthy database', async () => {
    await request(app).get('/api/health').expect(200, { status: 'ok', database: 'ok' });
  });
});
