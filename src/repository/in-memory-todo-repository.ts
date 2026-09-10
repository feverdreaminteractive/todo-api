import type { Todo } from '../domain/todo';
import type { TodoRepository } from './todo-repository';

/** Map-backed implementation used by fast unit/integration tests -- no I/O. */
export class InMemoryTodoRepository implements TodoRepository {
  private readonly todos = new Map<string, Todo>();

  async findAll(): Promise<Todo[]> {
    return Array.from(this.todos.values());
  }

  async findById(id: string): Promise<Todo | undefined> {
    return this.todos.get(id);
  }

  async create(todo: Todo): Promise<Todo> {
    this.todos.set(todo.id, todo);
    return todo;
  }

  async update(id: string, patch: Partial<Todo>): Promise<Todo | undefined> {
    const existing = this.todos.get(id);
    if (!existing) return undefined;
    const updated: Todo = { ...existing, ...patch };
    this.todos.set(id, updated);
    return updated;
  }

  async remove(id: string): Promise<boolean> {
    return this.todos.delete(id);
  }
}
