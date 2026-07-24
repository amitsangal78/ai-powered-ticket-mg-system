export type ApiErrorBody = {
  error: string;
  code: string;
  details?: unknown;
};

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    error: string,
    details?: unknown,
  ) {
    super(error);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }

  toJSON(): ApiErrorBody {
    const body: ApiErrorBody = {
      error: this.message,
      code: this.code,
    };
    if (this.details !== undefined) {
      body.details = this.details;
    }
    return body;
  }
}

export function validationError(details: unknown): AppError {
  return new AppError(400, 'VALIDATION_ERROR', 'Validation failed', details);
}
