import type { RequestHandler } from 'express';
import type { Logger } from '../logger.ts';

export function requestLogger(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info('request completed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
      });
    });
    next();
  };
}
