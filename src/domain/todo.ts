import { z } from 'zod';

const DATE_FORMAT_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Rejects both malformed strings and JS Date's silent rollover for
 * out-of-range dates (e.g. "2024-02-30" would otherwise parse as March 1).
 */
function isValidCalendarDate(value: string): boolean {
  if (!DATE_FORMAT_RE.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const dueDateSchema = z
  .string()
  .refine(isValidCalendarDate, { message: 'dueDate must be a valid calendar date in YYYY-MM-DD format' });

const titleSchema = z
  .string()
  .trim()
  .min(1, 'title is required')
  .max(200, 'title must be 200 characters or fewer');

const descriptionSchema = z.string().max(2000, 'description must be 2000 characters or fewer');

export const createTodoSchema = z
  .object({
    title: titleSchema,
    description: descriptionSchema.optional(),
    dueDate: dueDateSchema.optional(),
  })
  .strict();

export const updateTodoSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    dueDate: dueDateSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'at least one of title, description, or dueDate must be provided',
  });

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;

export interface Todo {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}
