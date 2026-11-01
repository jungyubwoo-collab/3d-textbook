import { pino, type Logger } from 'pino';
import type { Env } from './env.ts';

export type { Logger };

export function createLogger(env: Pick<Env, 'NODE_ENV' | 'LOG_LEVEL'>): Logger {
  if (env.NODE_ENV === 'development') {
    return pino({
      level: env.LOG_LEVEL,
      transport: {
        target: 'pino-pretty',
        // 요청 로그는 메시지 한 줄에 이미 담겨 있으므로 req/res 객체는 숨긴다.
        options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname,req,res,responseTime' },
      },
    });
  }
  return pino({ level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL });
}
