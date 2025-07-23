import { NextResponse } from "next/server";
import { ZodError } from "zod";

// Error codes for consistent error handling
export const ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_REQUEST: "INVALID_REQUEST",

  // Authentication/Authorization
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Rate limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",

  // Upload errors
  UPLOAD_FAILED: "UPLOAD_FAILED",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",

  // External service errors
  CLOUDFLARE_ERROR: "CLOUDFLARE_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",

  // Generic errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_FOUND: "NOT_FOUND",
  METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// Standard error response format
export interface ApiErrorResponse {
  error: ErrorCode;
  message: string;
  details?: Record<string, any>;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: ErrorCode,
  message: string,
  status: number,
  details?: Record<string, any>
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    error,
    message,
  };

  if (details) {
    response.details = details;
  }

  return NextResponse.json(response, { status });
}

/**
 * Handle validation errors (Zod)
 */
export function handleValidationError(
  error: ZodError
): NextResponse<ApiErrorResponse> {
  const details = error.issues.reduce<Record<string, string>>(
    (acc: Record<string, string>, curr) => {
      const field = curr.path.join(".");
      acc[field] = curr.message;
      return acc;
    },
    {}
  );

  return createErrorResponse(
    ERROR_CODES.VALIDATION_ERROR,
    "Validation failed",
    400,
    details
  );
}

/**
 * Handle rate limit exceeded error
 */
export function handleRateLimitError(
  message: string = "Too many requests. Please try again later.",
  resetTime?: number
): NextResponse<ApiErrorResponse> {
  const response = createErrorResponse(
    ERROR_CODES.RATE_LIMIT_EXCEEDED,
    message,
    429
  );

  if (resetTime) {
    response.headers.set(
      "Retry-After",
      Math.ceil((resetTime - Date.now()) / 1000).toString()
    );
  }

  return response;
}

/**
 * Handle not found error
 */
export function handleNotFoundError(
  message: string = "Resource not found"
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(ERROR_CODES.NOT_FOUND, message, 404);
}

/**
 * Handle method not allowed error
 */
export function handleMethodNotAllowedError(
  allowedMethods: string[] = []
): NextResponse<ApiErrorResponse> {
  const response = createErrorResponse(
    ERROR_CODES.METHOD_NOT_ALLOWED,
    "Method not allowed",
    405
  );

  if (allowedMethods.length > 0) {
    response.headers.set("Allow", allowedMethods.join(", "));
  }

  return response;
}

/**
 * Handle internal server error
 */
export function handleInternalError(
  message: string = "Internal server error",
  details?: Record<string, any>
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, message, 500, details);
}

/**
 * Handle Cloudflare API errors
 */
export function handleCloudflareError(
  status: number,
  message?: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    ERROR_CODES.CLOUDFLARE_ERROR,
    message || "Cloudflare API error",
    status >= 500 ? 503 : status
  );
}

/**
 * Handle database errors
 */
export function handleDatabaseError(
  message: string = "Database operation failed"
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(ERROR_CODES.DATABASE_ERROR, message, 500);
}

/**
 * Handle upload-specific errors
 */
export function handleUploadError(
  error: ErrorCode,
  message: string
): NextResponse<ApiErrorResponse> {
  const statusMap: Record<string, number> = {
    [ERROR_CODES.FILE_TOO_LARGE]: 413,
    [ERROR_CODES.INVALID_FILE_TYPE]: 415,
    [ERROR_CODES.UPLOAD_FAILED]: 500,
  };

  return createErrorResponse(error, message, statusMap[error] || 400);
}

/**
 * Generic error handler that tries to categorize unknown errors
 */
export function handleUnknownError(
  error: unknown
): NextResponse<ApiErrorResponse> {
  console.error("Unknown error:", error);

  if (error instanceof ZodError) {
    return handleValidationError(error);
  }

  if (error instanceof Error) {
    return handleInternalError(error.message);
  }

  return handleInternalError("An unexpected error occurred");
}
