import { createApp } from './app.ts';
import { createPrismaClient } from './db.ts';
import { loadEnv } from './env.ts';
import { createLogger } from './logger.ts';

function main(): void {
  const env = loadEnv();
  const logger = createLogger(env);
  const prisma = createPrismaClient(env.DATABASE_URL);
  const app = createApp({ prisma, logger });

  const server = app.listen(env.PORT, (error) => {
    if (error) {
      logger.fatal({ err: error }, `포트 ${env.PORT}에서 서버를 열지 못했습니다.`);
      process.exit(1);
    }
    logger.info(`API 서버 실행 중: http://localhost:${env.PORT}/api/health`);
  });

  const shutdown = (signal: NodeJS.Signals) => {
    logger.info({ signal }, '서버를 종료합니다.');
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
