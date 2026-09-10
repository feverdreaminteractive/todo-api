import request from 'supertest';
import type { Express } from 'express';
import { createApp } from './app';
import { InMemoryTodoRepository } from './repository/in-memory-todo-repository';
import type { TodoRepository } from './repository/todo-repository';

function buildApp(): Express {
  return createApp(new InMemoryTodoRepository());
}

/** Repository whose every method throws, to exercise the error handler's generic 500 fallback. */
class ThrowingTodoRepository implements TodoRepository {
  private fail(): never {
    throw new Error('boom');
  }
  findAll(): Promise<never> {
    return this.fail();
  }
  findById(): Promise<never> {
    return this.fail();
  }
  create(): Promise<never> {
    return this.fail();
  }
  update(): Promise<never> {
    return this.fail();
  }
  remove(): Promise<never> {
    return this.fail();
  }
}

async function createTodo(app: Express, body: Record<string, unknown> = { title: 'Buy milk' }) {
  const res = await request(app).post('/todos').send(body);
  return res.body;
}

describe('Todos API', () => {
  describe('POST /todos', () => {
    it('creates a todo and returns 201', async () => {
      const app = buildApp();
      const res = await request(app).post('/todos').send({ title: 'Buy milk' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ title: 'Buy milk', isCompleted: false });
      expect(res.body.id).toBeTruthy();
    });

    it('returns 400 for a missing title', async () => {
      const app = buildApp();
      const res = await request(app).post('/todos').send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for an unknown field', async () => {
      const app = buildApp();
      const res = await request(app).post('/todos').send({ title: 'ok', isCompleted: true });

      expect(res.status).toBe(400);
    });

    it('returns 400 for malformed JSON', async () => {
      const app = buildApp();
      const res = await request(app).post('/todos').set('Content-Type', 'application/json').send('{not json');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MALFORMED_JSON');
    });
  });

  describe('GET /todos', () => {
    it('returns an empty array when nothing has been created', async () => {
      const app = buildApp();
      const res = await request(app).get('/todos');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('lists created todos', async () => {
      const app = buildApp();
      await createTodo(app, { title: 'A' });
      await createTodo(app, { title: 'B' });

      const res = await request(app).get('/todos');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('filters by completed=true', async () => {
      const app = buildApp();
      const a = await createTodo(app, { title: 'A' });
      await createTodo(app, { title: 'B' });
      await request(app).patch(`/todos/${a.id}/complete`);

      const res = await request(app).get('/todos?completed=true');
      expect(res.status).toBe(200);
      expect(res.body.map((t: { title: string }) => t.title)).toEqual(['A']);
    });

    it('sorts by title descending', async () => {
      const app = buildApp();
      await createTodo(app, { title: 'Alice' });
      await createTodo(app, { title: 'Bob' });

      const res = await request(app).get('/todos?sortBy=title&order=desc');
      expect(res.body.map((t: { title: string }) => t.title)).toEqual(['Bob', 'Alice']);
    });

    it('returns 400 for an invalid query param value', async () => {
      const app = buildApp();
      const res = await request(app).get('/todos?completed=maybe');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for an unknown query param', async () => {
      const app = buildApp();
      const res = await request(app).get('/todos?bogus=1');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /todos/:id', () => {
    it('returns the todo when found', async () => {
      const app = buildApp();
      const created = await createTodo(app);

      const res = await request(app).get(`/todos/${created.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.id);
    });

    it('returns 404 when not found', async () => {
      const app = buildApp();
      const res = await request(app).get('/todos/does-not-exist');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /todos/:id', () => {
    it('updates the title/description/dueDate and returns 200', async () => {
      const app = buildApp();
      const created = await createTodo(app);

      const res = await request(app).put(`/todos/${created.id}`).send({ title: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated');
    });

    it('returns 400 when trying to set isCompleted through PUT', async () => {
      const app = buildApp();
      const created = await createTodo(app);

      const res = await request(app).put(`/todos/${created.id}`).send({ isCompleted: true });
      expect(res.status).toBe(400);
    });

    it('returns 404 for a missing todo', async () => {
      const app = buildApp();
      const res = await request(app).put('/todos/does-not-exist').send({ title: 'x' });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /todos/:id/complete and /incomplete', () => {
    it('marks a todo completed then incomplete', async () => {
      const app = buildApp();
      const created = await createTodo(app);

      const completed = await request(app).patch(`/todos/${created.id}/complete`);
      expect(completed.status).toBe(200);
      expect(completed.body.isCompleted).toBe(true);

      const incomplete = await request(app).patch(`/todos/${created.id}/incomplete`);
      expect(incomplete.status).toBe(200);
      expect(incomplete.body.isCompleted).toBe(false);
    });

    it('returns 404 for a missing todo on either action', async () => {
      const app = buildApp();
      expect((await request(app).patch('/todos/missing/complete')).status).toBe(404);
      expect((await request(app).patch('/todos/missing/incomplete')).status).toBe(404);
    });
  });

  describe('DELETE /todos/:id', () => {
    it('deletes an existing todo and returns 204', async () => {
      const app = buildApp();
      const created = await createTodo(app);

      const res = await request(app).delete(`/todos/${created.id}`);
      expect(res.status).toBe(204);

      const getRes = await request(app).get(`/todos/${created.id}`);
      expect(getRes.status).toBe(404);
    });

    it('returns 404 when deleting a missing todo', async () => {
      const app = buildApp();
      const res = await request(app).delete('/todos/does-not-exist');
      expect(res.status).toBe(404);
    });
  });

  describe('unexpected errors', () => {
    it('returns a generic 500 for an error the app did not anticipate', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      const app = createApp(new ThrowingTodoRepository());

      const res = await request(app).get('/todos');

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      consoleErrorSpy.mockRestore();
    });
  });
});
