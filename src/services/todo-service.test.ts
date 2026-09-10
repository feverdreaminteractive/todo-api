import { InMemoryTodoRepository } from '../repository/in-memory-todo-repository';
import { NotFoundError, ValidationError } from '../errors/app-errors';
import { TodoService } from './todo-service';

function daysFromToday(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

describe('TodoService', () => {
  let service: TodoService;

  beforeEach(() => {
    service = new TodoService(new InMemoryTodoRepository());
  });

  describe('createTodo', () => {
    it('creates a todo with generated id/timestamps and isCompleted defaulted to false', async () => {
      const todo = await service.createTodo({ title: 'Buy milk' });
      expect(todo.id).toBeTruthy();
      expect(todo.title).toBe('Buy milk');
      expect(todo.isCompleted).toBe(false);
      expect(todo.createdAt).toBe(todo.updatedAt);
    });

    it('throws ValidationError for a missing title', async () => {
      await expect(service.createTodo({})).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for an unknown field', async () => {
      await expect(service.createTodo({ title: 'ok', isCompleted: true })).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('listTodos', () => {
    it('returns everything with no filters', async () => {
      await service.createTodo({ title: 'A' });
      await service.createTodo({ title: 'B' });
      expect(await service.listTodos()).toHaveLength(2);
    });

    it('filters by completed status', async () => {
      const a = await service.createTodo({ title: 'A' });
      await service.createTodo({ title: 'B' });
      await service.completeTodo(a.id);

      const completed = await service.listTodos({ completed: true });
      expect(completed.map((t) => t.title)).toEqual(['A']);

      const incomplete = await service.listTodos({ completed: false });
      expect(incomplete.map((t) => t.title)).toEqual(['B']);
    });

    it('filters overdue items (past due date, not completed)', async () => {
      const overdue = await service.createTodo({ title: 'Overdue', dueDate: daysFromToday(-2) });
      await service.createTodo({ title: 'Future', dueDate: daysFromToday(2) });
      const overdueButDone = await service.createTodo({ title: 'Overdue but done', dueDate: daysFromToday(-1) });
      await service.completeTodo(overdueButDone.id);

      const result = await service.listTodos({ overdue: true });
      expect(result.map((t) => t.id)).toEqual([overdue.id]);
    });

    it('sorts by title ascending and descending', async () => {
      await service.createTodo({ title: 'Charlie' });
      await service.createTodo({ title: 'Alice' });
      await service.createTodo({ title: 'Bob' });

      const asc = await service.listTodos({ sortBy: 'title', order: 'asc' });
      expect(asc.map((t) => t.title)).toEqual(['Alice', 'Bob', 'Charlie']);

      const desc = await service.listTodos({ sortBy: 'title', order: 'desc' });
      expect(desc.map((t) => t.title)).toEqual(['Charlie', 'Bob', 'Alice']);
    });

    it('sorts by dueDate, with undated items sorting first ascending', async () => {
      await service.createTodo({ title: 'Later', dueDate: daysFromToday(5) });
      await service.createTodo({ title: 'No date' });
      await service.createTodo({ title: 'Sooner', dueDate: daysFromToday(1) });

      const sorted = await service.listTodos({ sortBy: 'dueDate', order: 'asc' });
      expect(sorted.map((t) => t.title)).toEqual(['No date', 'Sooner', 'Later']);
    });
  });

  describe('getTodo', () => {
    it('returns the todo when found', async () => {
      const created = await service.createTodo({ title: 'Find me' });
      expect(await service.getTodo(created.id)).toEqual(created);
    });

    it('throws NotFoundError when missing', async () => {
      await expect(service.getTodo('missing')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('updateTodo', () => {
    it('updates only the provided fields and bumps updatedAt', async () => {
      const created = await service.createTodo({ title: 'Original', description: 'Original desc' });
      await new Promise((resolve) => setTimeout(resolve, 2));

      const updated = await service.updateTodo(created.id, { title: 'Updated' });

      expect(updated.title).toBe('Updated');
      expect(updated.description).toBe('Original desc');
      expect(updated.updatedAt).not.toBe(created.updatedAt);
      expect(updated.createdAt).toBe(created.createdAt);
    });

    it('throws ValidationError when trying to set isCompleted through update', async () => {
      const created = await service.createTodo({ title: 'Original' });
      await expect(service.updateTodo(created.id, { isCompleted: true })).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError for an empty update payload', async () => {
      const created = await service.createTodo({ title: 'Original' });
      await expect(service.updateTodo(created.id, {})).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws NotFoundError when the todo does not exist', async () => {
      await expect(service.updateTodo('missing', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('completeTodo / incompleteTodo', () => {
    it('marks a todo completed and back to incomplete', async () => {
      const created = await service.createTodo({ title: 'Toggle me' });

      const completed = await service.completeTodo(created.id);
      expect(completed.isCompleted).toBe(true);

      const incomplete = await service.incompleteTodo(created.id);
      expect(incomplete.isCompleted).toBe(false);
    });

    it('throws NotFoundError for a missing todo on either transition', async () => {
      await expect(service.completeTodo('missing')).rejects.toBeInstanceOf(NotFoundError);
      await expect(service.incompleteTodo('missing')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('deleteTodo', () => {
    it('removes an existing todo', async () => {
      const created = await service.createTodo({ title: 'Delete me' });
      await service.deleteTodo(created.id);
      await expect(service.getTodo(created.id)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('throws NotFoundError for a missing todo', async () => {
      await expect(service.deleteTodo('missing')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
