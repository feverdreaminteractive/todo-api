import path from 'node:path';
import express, { type Express } from 'express';
import type { TodoRepository } from './repository/todo-repository';
import { TodoService } from './services/todo-service';
import { createRoutes } from './http/routes';
import { errorHandler } from './http/middleware/error-handler';

// public/ sits one level up from this file whether running compiled
// (dist/app.js) or via tsx in dev (src/app.ts) -- both resolve to the
// project root's public/ directory.
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

/**
 * Builds a fully-wired Express app with no side-effecting listen() call, so
 * tests can exercise real HTTP routing/middleware against an in-memory
 * repository with zero network or file I/O.
 */
export function createApp(repository: TodoRepository): Express {
  const app = express();
  app.use(express.json());
  app.use(express.static(PUBLIC_DIR));

  const service = new TodoService(repository);
  app.use(createRoutes(service));

  app.use(errorHandler);

  return app;
}
