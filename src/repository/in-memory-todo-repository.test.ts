import { InMemoryTodoRepository } from './in-memory-todo-repository';
import { testTodoRepositoryContract } from './todo-repository.contract';

describe('InMemoryTodoRepository', () => {
  testTodoRepositoryContract(() => new InMemoryTodoRepository());
});
