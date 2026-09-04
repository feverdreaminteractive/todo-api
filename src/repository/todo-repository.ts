import type { Todo } from '../domain/todo';

/**
 * Storage-agnostic persistence contract. The service layer depends on this
 * interface, never on a concrete implementation -- that's what lets storage
 * be swapped (or faked in tests) without touching business logic.
 */
export interface TodoRepository {
  findAll(): Promise<Todo[]>;
  findById(id: string): Promise<Todo | undefined>;
  create(todo: Todo): Promise<Todo>;
  update(id: string, patch: Partial<Todo>): Promise<Todo | undefined>;
  remove(id: string): Promise<boolean>;
}
