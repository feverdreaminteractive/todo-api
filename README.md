# To-Do API

[![CI](https://github.com/feverdreaminteractive/todo-api/actions/workflows/ci.yml/badge.svg)](https://github.com/feverdreaminteractive/todo-api/actions/workflows/ci.yml)

A REST API to-do list app, built for a take-home skills assessment. TypeScript + Express, a
layered/repository architecture, zod validation, and three tiers of automated tests.

For a deeper technical dive (request-flow diagram, why validation lives in two places, the
actual storage swap point), see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). For the dev
workflow (branch strategy, labels, PR process), see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Setup & running it

Requires Node.js 22+.

```sh
npm install

# development (auto-restarts on file changes)
npm run dev

# production
npm run build
npm start
```

The server listens on `http://localhost:3000` by default. Two env vars, both optional:

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DATA_FILE` | `./data/todos.json` | Where todos are persisted |

### Docker

```sh
docker build -t todo-api .
docker run -p 3000:3000 todo-api
```

Data persists inside the container at `/app/data/todos.json` by default — it will **not**
survive removing the container unless you mount a volume:

```sh
docker run -p 3000:3000 -v "$(pwd)/data:/app/data" todo-api
```

Verified end to end: image builds, full CRUD works through the container, and data survives
a container being stopped, removed, and recreated against the same mounted volume.

## Running the tests

```sh
npm test              # all tests
npm run test:coverage # with a coverage report
npm run lint           # ESLint
```

## API

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| `POST` | `/todos` | `{ title, description?, dueDate? }` | `201` + created todo | `400` |
| `GET` | `/todos` | — (query: `completed`, `overdue`, `sortBy`, `order`) | `200` + array | `400` on invalid query |
| `GET` | `/todos/:id` | — | `200` + todo | `404` |
| `PUT` | `/todos/:id` | `{ title?, description?, dueDate? }` (at least one) | `200` + updated todo | `400`, `404` |
| `PATCH` | `/todos/:id/complete` | — | `200` + updated todo | `404` |
| `PATCH` | `/todos/:id/incomplete` | — | `200` + updated todo | `404` |
| `DELETE` | `/todos/:id` | — | `204` | `404` |

`GET /todos` query params: `completed=true\|false`, `overdue=true\|false` (past `dueDate`,
not completed), `sortBy=dueDate\|createdAt\|title`, `order=asc\|desc`. Unknown params or
invalid values return `400`.

Errors are always `{ "error": { "message": string, "code": string, "issues"?: [...] } }`.

### Example

```sh
curl -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk","dueDate":"2026-12-25"}'

curl http://localhost:3000/todos?completed=false&sortBy=dueDate
```

### API testing

A [Postman collection](postman/todo-api.postman_collection.json) covers the full REST surface,
including validation-error and not-found cases. **[View it live in Postman](https://documenter.getpostman.com/view/57960081/2sBYAvvqa5)**
— browsable docs with example requests/responses, no import needed. Or import the file directly
by URL, or run it headless with [newman](https://github.com/postmanlabs/newman):

```sh
npx newman run postman/todo-api.postman_collection.json
```

## Design choices

**Layered architecture, repository pattern.** `http` (routes/controllers/middleware) → `services`
(business rules) → `repository` (an interface, plus `InMemoryTodoRepository` and
`JsonFileTodoRepository`). `TodoService` depends on the `TodoRepository` *interface*, never a
concrete class — that's what makes storage swappable (the assignment specifically calls this
out as acceptable) and what makes the service layer testable with zero I/O.

**Validation lives in the service, not just HTTP middleware.** `TodoService` validates input
directly against the zod schemas in `domain/todo.ts`, translating `ZodError` into this app's own
`ValidationError`. That makes the service safe to call from any caller (not just an Express
request that happened to pass through validation middleware first) and lets the "required
title," "unknown field rejected," etc. business rules be unit-tested directly without spinning
up HTTP at all. The one exception is `GET /todos`'s query-string params (`completed`, `sortBy`,
etc.) — those are HTTP-specific string-to-typed-filter coercion with no service-layer
equivalent, so that validation genuinely belongs in `http/middleware/validate.ts` instead.

**`updateTodoSchema` is `.strict()`, so `isCompleted` can't be set through `PUT`.** Passing it
fails validation outright (`400`) rather than being silently ignored — callers are forced to use
`PATCH /todos/:id/complete` / `.../incomplete` instead, which matches the API shape the
assignment itself describes.

**Why zod:** one schema defines both the runtime validation and the inferred TypeScript type
(`CreateTodoInput`/`UpdateTodoInput`), so the two can't drift apart.

**Testing strategy — three genuinely different tiers, not one flavor repeated three times:**
1. **Domain/service unit tests** — zero I/O, run against `InMemoryTodoRepository`. Covers
   business rules and validation edge cases fast.
2. **Repository tests** — `JsonFileTodoRepository` against a real temp file
   (`fs.mkdtemp`/`os.tmpdir()`), including a test that creates a *second* repository instance
   pointed at the same file and confirms it sees the first instance's data — proving persistence
   survives a restart, not just an in-process cache. Both repository implementations are checked
   against one shared CRUD contract (`todo-repository.contract.ts`) so the two test files aren't
   duplicating the same assertions.
3. **HTTP integration tests** — `supertest` against the real `createApp()`-built Express app
   (`InMemoryTodoRepository` injected), covering every endpoint, status code, and the
   query-param filter/sort behavior end to end through real routing/middleware.

Beyond the automated suite, the full CRUD + complete/incomplete lifecycle was also manually
verified via `curl` against a running server, including killing and restarting the dev server
to confirm data actually survives on disk (not just what the repository's own unit tests show
in isolation).

## Assumptions

- Added an `updatedAt` field beyond the assignment's required data model — any real
  task-tracking system needs one, and it's used by the tests to confirm updates actually
  changed something.
- `dueDate` has no time component (date-only, `YYYY-MM-DD`), per the assignment's own example
  format.
- The update endpoint (`PUT /todos/:id`) intentionally cannot touch `isCompleted`; use the
  dedicated complete/incomplete actions instead.
- Single-process file-based persistence (with an in-process write lock) is sufficient for this
  assessment's scope — see trade-offs below.

## Trade-offs

- **No real database.** A JSON file is what the assignment says is sufficient. The repository
  interface exists specifically so this is a one-file swap later, without touching the service
  or HTTP layers.
- **File locking is in-process only** (a promise-chain queue inside `JsonFileTodoRepository`),
  which is correct for a single Node process but would not coordinate writes across multiple
  instances/processes sharing the same file — a real multi-instance deployment needs a real
  datastore, not file locking tricks.
- **No auth/multi-user support** — out of scope per the assignment; every todo is global, not
  scoped to a user.
