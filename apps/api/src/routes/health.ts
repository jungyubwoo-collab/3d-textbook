import type { HealthResponse } from '@3d-textbook/shared';
import { Router } from 'express';
import type { PrismaClient } from '../db.ts';

export function healthRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    let database: HealthResponse['database'] = 'ok';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'unreachable';
    }
    const body: HealthResponse = { status: database === 'ok' ? 'ok' : 'degraded', database };
    res.status(database === 'ok' ? 200 : 503).json(body);
  });

  return router;
}
