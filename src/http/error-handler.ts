import type { ErrorRequestHandler } from 'express';
import type { Logger } from '../logger.ts';

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Also matches the errors thrown by express-openapi-validator and body-parser.
interface ApiError extends Error {
  status?: number;
  errors?: { path: string; message: string }[];
}

const codes: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  404: 'NOT_FOUND',
  415: 'UNSUPPORTED_MEDIA_TYPE',
};

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err: ApiError, _req, res, _next) => {
    const status = err.status ?? 500;

    if (status >= 500) {
      logger.error('unhandled error', { error: err });
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
      return;
    }

    res.status(status).json({
      code: codes[status] ?? 'BAD_REQUEST',
      message: err.message,
      details: err.errors?.map(({ path, message }) => ({ path, message })),
    });
  };
}
