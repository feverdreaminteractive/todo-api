import type { Request, Response } from 'express';
import type { TodoService, ListTodosFilters } from '../../services/todo-service';

export function createTodosController(service: TodoService) {
  return {
    async create(req: Request, res: Response): Promise<void> {
      const todo = await service.createTodo(req.body);
      res.status(201).json(todo);
    },

    async list(req: Request, res: Response): Promise<void> {
      const filters = (req.validated ?? {}) as ListTodosFilters;
      const todos = await service.listTodos(filters);
      res.status(200).json(todos);
    },

    async getOne(req: Request, res: Response): Promise<void> {
      const todo = await service.getTodo(req.params.id);
      res.status(200).json(todo);
    },

    async update(req: Request, res: Response): Promise<void> {
      const todo = await service.updateTodo(req.params.id, req.body);
      res.status(200).json(todo);
    },

    async complete(req: Request, res: Response): Promise<void> {
      const todo = await service.completeTodo(req.params.id);
      res.status(200).json(todo);
    },

    async incomplete(req: Request, res: Response): Promise<void> {
      const todo = await service.incompleteTodo(req.params.id);
      res.status(200).json(todo);
    },

    async remove(req: Request, res: Response): Promise<void> {
      await service.deleteTodo(req.params.id);
      res.status(204).send();
    },
  };
}
