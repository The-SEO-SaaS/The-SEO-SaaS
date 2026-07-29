/**
 * A single error taxonomy for the whole backend.
 *
 * Every error carries a stable machine-readable `code` and an HTTP `status`,
 * so route handlers can serialise any thrown AppError without a translation
 * layer, and the client can branch on codes instead of parsing strings.
 */

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "PAYMENT_REQUIRED"
  | "UPSTREAM_ERROR"
  | "TIMEOUT"
  | "INTERNAL";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  QUOTA_EXCEEDED: 429,
  RATE_LIMITED: 429,
  TIMEOUT: 504,
  UPSTREAM_ERROR: 502,
  INTERNAL: 500,
};

export interface AppErrorOptions {
  /** Structured detail safe to return to the client. */
  details?: Record<string, unknown>;
  /** Original error, kept for logs. Never serialised to the client. */
  cause?: unknown;
  /** Seconds the client should wait before retrying. */
  retryAfter?: number;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;
  readonly retryAfter?: number;

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = options.details;
    this.retryAfter = options.retryAfter;
  }

  /** Shape returned to the client. Deliberately omits `cause` and stack. */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
        ...(this.retryAfter !== undefined ? { retryAfter: this.retryAfter } : {}),
      },
    };
  }

  static badRequest(message: string, options?: AppErrorOptions) {
    return new AppError("BAD_REQUEST", message, options);
  }
  static unauthorized(message = "You need to be signed in.", options?: AppErrorOptions) {
    return new AppError("UNAUTHORIZED", message, options);
  }
  static forbidden(message = "You don't have access to this.", options?: AppErrorOptions) {
    return new AppError("FORBIDDEN", message, options);
  }
  static notFound(message = "Not found.", options?: AppErrorOptions) {
    return new AppError("NOT_FOUND", message, options);
  }
  static conflict(message: string, options?: AppErrorOptions) {
    return new AppError("CONFLICT", message, options);
  }
  static rateLimited(message = "Too many requests.", options?: AppErrorOptions) {
    return new AppError("RATE_LIMITED", message, options);
  }
  static quotaExceeded(message: string, options?: AppErrorOptions) {
    return new AppError("QUOTA_EXCEEDED", message, options);
  }
  static paymentRequired(message: string, options?: AppErrorOptions) {
    return new AppError("PAYMENT_REQUIRED", message, options);
  }
  static upstream(message: string, options?: AppErrorOptions) {
    return new AppError("UPSTREAM_ERROR", message, options);
  }
  static timeout(message = "The request timed out.", options?: AppErrorOptions) {
    return new AppError("TIMEOUT", message, options);
  }
  static internal(message = "Something went wrong.", options?: AppErrorOptions) {
    return new AppError("INTERNAL", message, options);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Normalises anything thrown into an AppError. Unknown errors collapse to a
 * generic INTERNAL so we never leak an upstream message to the client.
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  if (error instanceof Error) {
    return AppError.internal("Something went wrong.", { cause: error });
  }
  return AppError.internal("Something went wrong.", { cause: error });
}
