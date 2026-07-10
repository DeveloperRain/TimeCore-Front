export type ApiErrorPayload = {
  status?: string;
  message?: string;
  request_id?: string;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  requestId?: string;

  constructor({
    message,
    status,
    code = "API_ERROR",
    details,
    requestId,
  }: {
    message: string;
    status: number;
    code?: string;
    details?: unknown;
    requestId?: string;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export function getErrorMessage(error: unknown, fallback = "No se pudo completar la operación.") {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function isNetworkError(error: unknown) {
  return error instanceof ApiError && error.code === "NETWORK_ERROR";
}
