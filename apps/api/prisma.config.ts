import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma 7은 .env를 자동으로 읽지 않는다. 로컬 .env가 있으면 불러온다(이미 설정된 환경 변수가 우선).
const envFile = path.join(import.meta.dirname, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // generate는 DB 주소 없이도 동작하고, migrate 계열 명령만 DATABASE_URL이 필요하다.
  datasource: { url: process.env['DATABASE_URL'] },
});
