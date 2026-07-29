import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from "axios";

/**
 * Single axios instance for every browser → API call.
 *
 * Two jobs beyond plain axios:
 *  1. Unwrap the API's `{ data }` envelope so call sites get the payload.
 *  2. Normalise every failure into ApiError, so components branch on a stable
 *     `code` rather than poking at axios internals or parsing messages.
 */

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    retryAfter?: number;
  };
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;
  readonly retryAfter?: number;

  constructor(init: {
    code: string;
    message: string;
    status: number;
    details?: Record<string, unknown>;
    retryAfter?: number;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.code = init.code;
    this.status = init.status;
    this.details = init.details;
    this.retryAfter = init.retryAfter;
  }

  /** The user needs to sign in. */
  get isUnauthorized() {
    return this.status === 401;
  }

  /** The action needs a plan or more quota — show the upgrade path, not an error. */
  get isPaywalled() {
    return this.code === "PAYMENT_REQUIRED" || this.code === "QUOTA_EXCEEDED";
  }

  get isRateLimited() {
    return this.code === "RATE_LIMITED";
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: "/api",
  // Session lives in an httpOnly cookie, so it must ride along.
  withCredentials: true,
  timeout: 30_000,
  headers: { "content-type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (error instanceof AxiosError) {
      const status = error.response?.status ?? 0;
      const body = error.response?.data as ApiErrorBody | undefined;

      if (body?.error) {
        return Promise.reject(
          new ApiError({
            code: body.error.code,
            message: body.error.message,
            status,
            details: body.error.details,
            retryAfter: body.error.retryAfter,
          }),
        );
      }

      if (error.code === "ECONNABORTED") {
        return Promise.reject(
          new ApiError({
            code: "TIMEOUT",
            message: "That took too long. Please try again.",
            status: 504,
          }),
        );
      }

      if (!error.response) {
        return Promise.reject(
          new ApiError({
            code: "NETWORK",
            message: "You appear to be offline.",
            status: 0,
          }),
        );
      }

      return Promise.reject(
        new ApiError({
          code: "INTERNAL",
          message: "Something went wrong. Please try again.",
          status,
        }),
      );
    }

    return Promise.reject(error);
  },
);

/** Unwraps the `{ data }` envelope. All typed helpers below go through this. */
async function unwrap<T>(promise: Promise<{ data: T | { data: T } }>): Promise<T> {
  const response = await promise;
  const body = response.data as T | { data: T };

  if (body && typeof body === "object" && "data" in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) => unwrap<T>(api.get(url, config)),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(api.post(url, body, config)),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(api.patch(url, body, config)),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    unwrap<T>(api.put(url, body, config)),
  delete: <T>(url: string, config?: AxiosRequestConfig) => unwrap<T>(api.delete(url, config)),
};

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Safe message for display — never leaks an unexpected exception's text. */
export function errorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  return "Something went wrong. Please try again.";
}
