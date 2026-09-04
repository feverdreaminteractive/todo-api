import { z } from 'zod';

const booleanQueryParam = z.enum(['true', 'false']).transform((v) => v === 'true');

/** GET /todos?completed=&overdue=&sortBy=&order= -- coerces query strings into TodoService's ListTodosFilters shape. */
export const listQuerySchema = z
  .object({
    completed: booleanQueryParam.optional(),
    overdue: booleanQueryParam.optional(),
    sortBy: z.enum(['dueDate', 'createdAt', 'title']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  })
  .strict();
