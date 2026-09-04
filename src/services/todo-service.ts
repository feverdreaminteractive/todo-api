import { randomUUID } from 'node:crypto';
import { createTodoSchema, updateTodoSchema, type Todo } from '../domain/todo';
import type { TodoRepository } from '../repository/todo-repository';
import { NotFoundError, validationErrorFromZod } from '../errors/app-errors';

export interface ListTodosFilters {
  completed?: boolean;
  overdue?: boolean;
  sortBy?: 'dueDate' | 'createdAt' | 'title';
  order?: 'asc' | 'desc';
}

/**
 * All business rules live here, independent of HTTP -- validated directly
 * against the zod schemas (not just relied on via HTTP middleware), so this
 * class is safe to call from any caller and testable with zero I/O or
 * network involved.
 */
export class TodoService {
  constructor(private readonly repository: TodoRepository) {}

  async createTodo(input: unknown): Promise<Todo> {
    const parsed = createTodoSchema.safeParse(input);
    if (!parsed.success) throw validationErrorFromZod(parsed.error);

    const now = new Date().toISOString();
    const todo: Todo = {
      id: randomUUID(),
      title: parsed.data.title,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
    };
    return this.repository.create(todo);
  }

  async listTodos(filters: ListTodosFilters = {}): Promise<Todo[]> {
    let todos = await this.repository.findAll();

    if (filters.completed !== undefined) {
      todos = todos.filter((t) => t.isCompleted === filters.completed);
    }

    if (filters.overdue) {
      const today = new Date().toISOString().slice(0, 10);
      todos = todos.filter((t) => !t.isCompleted && t.dueDate !== undefined && t.dueDate < today);
    }

    if (filters.sortBy) {
      const sortBy = filters.sortBy;
      const dir = filters.order === 'desc' ? -1 : 1;
      todos = [...todos].sort((a, b) => {
        const av = a[sortBy] ?? '';
        const bv = b[sortBy] ?? '';
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    return todos;
  }

  async getTodo(id: string): Promise<Todo> {
    const todo = await this.repository.findById(id);
    if (!todo) throw new NotFoundError(`Todo not found: ${id}`);
    return todo;
  }

  async updateTodo(id: string, input: unknown): Promise<Todo> {
    const parsed = updateTodoSchema.safeParse(input);
    if (!parsed.success) throw validationErrorFromZod(parsed.error);

    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError(`Todo not found: ${id}`);

    const updated = await this.repository.update(id, { ...parsed.data, updatedAt: new Date().toISOString() });
    // existence was just confirmed above, so the repository is guaranteed to return the updated record
    return updated as Todo;
  }

  async completeTodo(id: string): Promise<Todo> {
    return this.setCompleted(id, true);
  }

  async incompleteTodo(id: string): Promise<Todo> {
    return this.setCompleted(id, false);
  }

  async deleteTodo(id: string): Promise<void> {
    const removed = await this.repository.remove(id);
    if (!removed) throw new NotFoundError(`Todo not found: ${id}`);
  }

  private async setCompleted(id: string, isCompleted: boolean): Promise<Todo> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundError(`Todo not found: ${id}`);
    const updated = await this.repository.update(id, { isCompleted, updatedAt: new Date().toISOString() });
    return updated as Todo;
  }
}
