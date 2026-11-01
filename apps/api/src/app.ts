import type { ApiErrorBody } from '@3d-textbook/shared';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { z } from 'zod';
import type { PrismaClient } from './db.ts';
import { HttpError } from './http-error.ts';
import type { Logger } from './logger.ts';
import { healthRouter } from './routes/health.ts';
import { predictionsRouter } from './routes/predictions.ts';

export interface AppDependencies {
  prisma: PrismaClient;
  logger: Logger;
}

export function createApp({ prisma, logger }: AppDependencies): express.Express {
  const app = express();

  app.use(helmet());
  app.use(
    pinoHttp({
      logger,
      // 요청마다 한 줄만 남긴다(헤더 전체를 찍지 않는다).
      serializers: {
        req: (req: { method: string; url: string }) => ({ method: req.method, url: req.url }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      customSuccessMessage: (req, res, responseTime) =>
        `${req.method} ${(req as express.Request).originalUrl} → ${res.statusCode} (${Math.round(responseTime)}ms)`,
    }),
  );
  app.use(express.json({ limit: '16kb' }));

  app.use('/api/health', healthRouter(prisma));
  app.use('/api/predictions', predictionsRouter(prisma));

  app.use(notFound);
  app.use(errorHandler(logger));

  return app;
}

const notFound: RequestHandler = (req, res) => {
  res.status(404).json(errorBody('not_found', `${req.method} ${req.path} 경로가 없습니다.`));
};

function errorHandler(logger: Logger): ErrorRequestHandler {
  // Express는 인자가 4개인 함수를 오류 처리기로 인식하므로 _next를 지우면 안 된다.
  return (error: unknown, _req, res, _next) => {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json(errorBody('invalid_request', '요청 값이 올바르지 않습니다.', z.treeifyError(error)));
      return;
    }
    if (error instanceof HttpError) {
      res.status(error.status).json(errorBody(error.code, error.message, error.details));
      return;
    }
    // express.json()이 던지는 오류(잘못된 JSON, 너무 큰 본문 등)는 status와 expose를 가진다.
    if (isClientError(error)) {
      res.status(error.status).json(errorBody('bad_request', error.message));
      return;
    }
    logger.error({ err: error }, 'Unhandled error');
    res.status(500).json(errorBody('internal_error', '서버에서 오류가 발생했습니다.'));
  };
}

function isClientError(error: unknown): error is { status: number; message: string } {
  return (
    error instanceof Error &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500 &&
    'expose' in error &&
    error.expose === true
  );
}

function errorBody(code: string, message: string, details?: unknown): ApiErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}
