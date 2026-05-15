export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON(traceId?: string): {
    code: string;
    message: string;
    traceId?: string;
    details?: Record<string, unknown>;
  } {
    return {
      code: this.code,
      message: this.message,
      ...(traceId ? { traceId } : {}),
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    super(
      'NOT_FOUND',
      404,
      identifier ? `${resource} không tìm thấy: ${identifier}` : `${resource} không tìm thấy`,
      identifier ? { resource, identifier } : { resource },
    );
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', 400, message, details);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, 409, message, details);
  }
}
