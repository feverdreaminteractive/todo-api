import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Todo } from '../domain/todo';
import type { TodoRepository } from './todo-repository';

/**
 * Reads/writes a single JSON array to disk. Writes are serialized through an
 * internal promise-chain lock so concurrent requests can't interleave a
 * read-modify-write cycle and corrupt the file -- fine for a single-process
 * demo like this; a real multi-instance deployment would need a real
 * datastore instead (which is exactly why TodoRepository is an interface).
 */
export class JsonFileTodoRepository implements TodoRepository {
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  private async readAll(): Promise<Todo[]> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      if (!raw.trim()) return [];
      return JSON.parse(raw) as Todo[];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  }

  private async writeAll(todos: Todo[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(todos, null, 2), 'utf-8');
  }

  private enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
    const result = this.writeQueue.then(task, task);
    this.writeQueue = result.catch(() => undefined);
    return result;
  }

  async findAll(): Promise<Todo[]> {
    return this.readAll();
  }

  async findById(id: string): Promise<Todo | undefined> {
    const todos = await this.readAll();
    return todos.find((t) => t.id === id);
  }

  async create(todo: Todo): Promise<Todo> {
    return this.enqueueWrite(async () => {
      const todos = await this.readAll();
      todos.push(todo);
      await this.writeAll(todos);
      return todo;
    });
  }

  async update(id: string, patch: Partial<Todo>): Promise<Todo | undefined> {
    return this.enqueueWrite(async () => {
      const todos = await this.readAll();
      const index = todos.findIndex((t) => t.id === id);
      if (index === -1) return undefined;
      const updated: Todo = { ...todos[index], ...patch };
      todos[index] = updated;
      await this.writeAll(todos);
      return updated;
    });
  }

  async remove(id: string): Promise<boolean> {
    return this.enqueueWrite(async () => {
      const todos = await this.readAll();
      const index = todos.findIndex((t) => t.id === id);
      if (index === -1) return false;
      todos.splice(index, 1);
      await this.writeAll(todos);
      return true;
    });
  }
}
