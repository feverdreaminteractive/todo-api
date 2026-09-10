import { randomUUID } from 'node:crypto';
import type { Todo } from '../domain/todo';
import type { TodoRepository } from './todo-repository';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: 'Buy milk',
    isCompleted: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Shared CRUD contract every TodoRepository implementation must satisfy.
 * Called from each implementation's own *.test.ts file (not itself matched
 * by Jest's testMatch) so the two implementations aren't asserting the same
 * behavior via duplicated, drift-prone test code.
 */
export function testTodoRepositoryContract(createRepo: () => TodoRepository | Promise<TodoRepository>): void {
  let repo: TodoRepository;

  beforeEach(async () => {
    repo = await createRepo();
  });

  it('returns an empty list when nothing has been created', async () => {
    expect(await repo.findAll()).toEqual([]);
  });

  it('creates and finds a todo by id', async () => {
    const todo = makeTodo();
    await repo.create(todo);
    expect(await repo.findById(todo.id)).toEqual(todo);
  });

  it('lists all created todos', async () => {
    const a = makeTodo({ title: 'A' });
    const b = makeTodo({ title: 'B' });
    await repo.create(a);
    await repo.create(b);
    const all = await repo.findAll();
    expect(all).toHaveLength(2);
    expect(all.map((t) => t.title).sort()).toEqual(['A', 'B']);
  });

  it('returns undefined when finding a missing id', async () => {
    expect(await repo.findById('does-not-exist')).toBeUndefined();
  });

  it('updates an existing todo and returns the updated record', async () => {
    const todo = makeTodo();
    await repo.create(todo);
    const updated = await repo.update(todo.id, { title: 'Updated' });
    expect(updated?.title).toBe('Updated');
    expect((await repo.findById(todo.id))?.title).toBe('Updated');
  });

  it('returns undefined when updating a missing id', async () => {
    expect(await repo.update('does-not-exist', { title: 'x' })).toBeUndefined();
  });

  it('removes an existing todo and returns true', async () => {
    const todo = makeTodo();
    await repo.create(todo);
    expect(await repo.remove(todo.id)).toBe(true);
    expect(await repo.findById(todo.id)).toBeUndefined();
  });

  it('returns false when removing a missing id', async () => {
    expect(await repo.remove('does-not-exist')).toBe(false);
  });
}
