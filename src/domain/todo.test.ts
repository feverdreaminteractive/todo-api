import { createTodoSchema, updateTodoSchema } from './todo';

describe('createTodoSchema', () => {
  it('accepts a title-only payload', () => {
    const result = createTodoSchema.safeParse({ title: 'Buy milk' });
    expect(result.success).toBe(true);
  });

  it('accepts a full payload', () => {
    const result = createTodoSchema.safeParse({
      title: 'Buy milk',
      description: 'Whole milk, the good kind',
      dueDate: '2026-12-25',
    });
    expect(result.success).toBe(true);
  });

  it('trims the title', () => {
    const result = createTodoSchema.safeParse({ title: '  Buy milk  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe('Buy milk');
  });

  it('rejects a missing title', () => {
    const result = createTodoSchema.safeParse({ description: 'no title here' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty or whitespace-only title', () => {
    expect(createTodoSchema.safeParse({ title: '' }).success).toBe(false);
    expect(createTodoSchema.safeParse({ title: '   ' }).success).toBe(false);
  });

  it('rejects a title over 200 characters', () => {
    const result = createTodoSchema.safeParse({ title: 'x'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('rejects a description over 2000 characters', () => {
    const result = createTodoSchema.safeParse({ title: 'ok', description: 'x'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it.each(['12-25-2026', '2026/12/25', 'not-a-date', '2026-13-01', '2026-02-30'])(
    'rejects a malformed dueDate: %s',
    (dueDate) => {
      const result = createTodoSchema.safeParse({ title: 'ok', dueDate });
      expect(result.success).toBe(false);
    }
  );

  it('accepts a leap-day dueDate', () => {
    const result = createTodoSchema.safeParse({ title: 'ok', dueDate: '2024-02-29' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown fields', () => {
    const result = createTodoSchema.safeParse({ title: 'ok', isCompleted: true });
    expect(result.success).toBe(false);
  });
});

describe('updateTodoSchema', () => {
  it('accepts a partial update with just one field', () => {
    expect(updateTodoSchema.safeParse({ title: 'New title' }).success).toBe(true);
    expect(updateTodoSchema.safeParse({ description: 'New description' }).success).toBe(true);
    expect(updateTodoSchema.safeParse({ dueDate: '2026-01-01' }).success).toBe(true);
  });

  it('rejects an empty update', () => {
    const result = updateTodoSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects attempts to set isCompleted, id, or createdAt through it', () => {
    expect(updateTodoSchema.safeParse({ title: 'ok', isCompleted: true }).success).toBe(false);
    expect(updateTodoSchema.safeParse({ id: 'abc' }).success).toBe(false);
    expect(updateTodoSchema.safeParse({ createdAt: '2026-01-01T00:00:00.000Z' }).success).toBe(false);
  });

  it('rejects a malformed dueDate', () => {
    const result = updateTodoSchema.safeParse({ dueDate: '2026-99-99' });
    expect(result.success).toBe(false);
  });
});
