import type { NextFunction, Request, Response } from 'express';
import { NotFoundError, ValidationError } from '../../errors/app-errors';

/** Centralized mapping from typed errors to HTTP status + a consistent JSON error shape. Must take 4 args for Express to recognize it as an error handler. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: { message: err.message, code: 'VALIDATION_ERROR', issues: err.issues } });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({ error: { message: err.message, code: 'NOT_FOUND' } });
    return;
  }

  if (err instanceof SyntaxError) {
    res.status(400).json({ error: { message: 'Malformed JSON body', code: 'MALFORMED_JSON' } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
}
