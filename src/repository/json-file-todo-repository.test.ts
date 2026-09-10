import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { JsonFileTodoRepository } from './json-file-todo-repository';
import { testTodoRepositoryContract } from './todo-repository.contract';

describe('JsonFileTodoRepository', () => {
  let filePath: string;

  beforeEach(async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'todo-repo-'));
    filePath = path.join(dir, 'todos.json');
  });

  afterEach(async () => {
    await fs.rm(path.dirname(filePath), { recursive: true, force: true });
  });

  testTodoRepositoryContract(() => new JsonFileTodoRepository(filePath));

  it('persists data across separate repository instances pointed at the same file (simulates an app restart)', async () => {
    const first = new JsonFileTodoRepository(filePath);
    const now = new Date().toISOString();
    const todo = { id: 'abc', title: 'Survive a restart', isCompleted: false, createdAt: now, updatedAt: now };
    await first.create(todo);

    const second = new JsonFileTodoRepository(filePath);
    expect(await second.findById('abc')).toEqual(todo);
  });

  it('creates the data file and its parent directory automatically if missing', async () => {
    const nestedPath = path.join(path.dirname(filePath), 'nested', 'todos.json');
    const repo = new JsonFileTodoRepository(nestedPath);
    const now = new Date().toISOString();
    const todo = { id: 'xyz', title: 'Auto-create', isCompleted: false, createdAt: now, updatedAt: now };

    await repo.create(todo);

    const raw = await fs.readFile(nestedPath, 'utf-8');
    expect(JSON.parse(raw)).toEqual([todo]);
  });

  it('serializes concurrent writes without corrupting the file', async () => {
    const repo = new JsonFileTodoRepository(filePath);
    const now = new Date().toISOString();
    const todos = Array.from({ length: 10 }, (_, i) => ({
      id: `todo-${i}`,
      title: `Todo ${i}`,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
    }));

    await Promise.all(todos.map((t) => repo.create(t)));

    const all = await repo.findAll();
    expect(all).toHaveLength(10);
    expect(all.map((t) => t.id).sort()).toEqual(todos.map((t) => t.id).sort());
  });
});
