import { Router } from 'express';
import type { TodoService } from '../services/todo-service';
import { createTodosController } from './controllers/todos-controller';
import { validate } from './middleware/validate';
import { listQuerySchema } from './list-query-schema';
import { asyncHandler } from './middleware/async-handler';

export function createRoutes(service: TodoService): Router {
  const router = Router();
  const controller = createTodosController(service);

  router.post('/todos', asyncHandler(controller.create));
  router.get('/todos', validate(listQuerySchema, 'query'), asyncHandler(controller.list));
  router.get('/todos/:id', asyncHandler(controller.getOne));
  router.put('/todos/:id', asyncHandler(controller.update));
  router.patch('/todos/:id/complete', asyncHandler(controller.complete));
  router.patch('/todos/:id/incomplete', asyncHandler(controller.incomplete));
  router.delete('/todos/:id', asyncHandler(controller.remove));

  return router;
}
