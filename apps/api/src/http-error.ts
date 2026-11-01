/** 라우트에서 던지면 오류 처리 미들웨어가 그대로 상태 코드와 JSON으로 바꿔 준다. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
