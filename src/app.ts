import express, { type Express } from 'express';
import type { TodoRepository } from './repository/todo-repository';
import { TodoService } from './services/todo-service';
import { createRoutes } from './http/routes';
import { errorHandler } from './http/middleware/error-handler';

/**
 * Builds a fully-wired Express app with no side-effecting listen() call, so
 * tests can exercise real HTTP routing/middleware against an in-memory
 * repository with zero network or file I/O.
 */
export function createApp(repository: TodoRepository): Express {
  const app = express();
  app.use(express.json());

  const service = new TodoService(repository);
  app.use(createRoutes(service));

  app.use(errorHandler);

  return app;
}
