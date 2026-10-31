import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  requestId?: string;
  errors?: any;
}

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly detail: string;
  public readonly errors?: any;

  constructor(status: number, code: string, detail: string, errors?: any) {
    super(detail);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(detail: string = "Bad Request", code: string = "BAD_REQUEST", errors?: any) {
    return new AppError(400, code, detail, errors);
  }

  static unauthorized(detail: string = "Unauthorized", code: string = "UNAUTHORIZED") {
    return new AppError(401, code, detail);
  }

  static forbidden(detail: string = "Forbidden", code: string = "FORBIDDEN") {
    return new AppError(403, code, detail);
  }

  static notFound(detail: string = "Resource not found", code: string = "NOT_FOUND") {
    return new AppError(404, code, detail);
  }

  static conflict(detail: string = "Conflict", code: string = "CONFLICT") {
    return new AppError(409, code, detail);
  }

  static unprocessable(detail: string = "Unprocessable Entity", code: string = "UNPROCESSABLE_ENTITY", errors?: any) {
    return new AppError(422, code, detail, errors);
  }

  static tooManyRequests(detail: string = "Too many requests", code: string = "TOO_MANY_REQUESTS") {
    return new AppError(429, code, detail);
  }

  static internal(detail: string = "Internal Server Error", code: string = "INTERNAL_SERVER_ERROR") {
    return new AppError(500, code, detail);
  }
}

const STATUS_TITLES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
};

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  const requestId = (req.headers["x-request-id"] as string) || (req as any).id || undefined;

  if (err instanceof AppError) {
    const problem: ProblemDetails = {
      type: `https://api.4kfellowship.org/errors/${err.code.toLowerCase().replace(/_/g, "-")}`,
      title: STATUS_TITLES[err.status] || "Error",
      status: err.status,
      detail: err.detail,
      code: err.code,
      requestId,
      errors: err.errors,
    };
    return res.status(err.status).type("application/problem+json").json(problem);
  }

  if (err instanceof ZodError) {
    const problem: ProblemDetails = {
      type: "https://api.4kfellowship.org/errors/validation-error",
      title: "Validation Error",
      status: 400,
      detail: "Invalid request payload or parameters",
      code: "VALIDATION_ERROR",
      requestId,
      errors: err.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    };
    return res.status(400).type("application/problem+json").json(problem);
  }

  console.error("[Unhandled Error]:", err);

  const problem: ProblemDetails = {
    type: "https://api.4kfellowship.org/errors/internal-server-error",
    title: "Internal Server Error",
    status: 500,
    detail: "An unexpected error occurred. Please try again later.",
    code: "INTERNAL_SERVER_ERROR",
    requestId,
  };

  return res.status(500).type("application/problem+json").json(problem);
};
