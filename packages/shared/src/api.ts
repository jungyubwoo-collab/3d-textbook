/** GET /api/health */
export interface HealthResponse {
  status: 'ok' | 'degraded';
  database: 'ok' | 'unreachable';
}

/** 모든 오류 응답의 모양 */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
