import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { redactUrl } from '../lib/redact.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const correlationId = randomUUID();
  res.locals.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const entry = {
      msg: 'http_request',
      correlationId,
      method: req.method,
      path: redactUrl(req.originalUrl),
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    };
    console.log(JSON.stringify(entry));
  });

  next();
}
