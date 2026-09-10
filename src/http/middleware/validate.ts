import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { validationErrorFromZod } from '../../errors/app-errors';

type Source = 'body' | 'query';

/**
 * Generic validation middleware. Only used for query params in this app
 * (see list-query-schema.ts) -- request bodies are validated inside
 * TodoService itself against the same domain schemas, so validating them
 * again here would just be redundant duplicate work for no extra safety.
 */
export function validate(schema: ZodSchema, source: Source) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(validationErrorFromZod(result.error));
      return;
    }
    req.validated = result.data;
    next();
  };
}
