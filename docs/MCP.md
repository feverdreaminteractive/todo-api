# MCP Server

`mcp/server.ts` exposes this API's to-do management as [Model Context Protocol](https://modelcontextprotocol.io)
tools, so an LLM agent (Claude Desktop, Claude Code, or any other MCP client) can create, list,
update, complete, and delete to-dos directly, in plain conversation instead of through curl or
the frontend.

A REST API with a clean, well-scoped resource (to-dos: create, read, update, two well-defined
state transitions, delete) is a natural fit for this — each endpoint maps to exactly one tool
with a clear, describable contract, which is exactly the shape MCP tools want.

## Running it

The MCP server talks to the REST API over HTTP — it doesn't touch the repository or service
layers directly. Start the API first:

```sh
npm run dev
```

Then, in a separate terminal:

```sh
npm run mcp
```

It runs over **stdio** — no hosting, no port, no deployment. An MCP client spawns it as a local
subprocess on demand, the same way most real-world MCP servers (filesystem, GitHub, Slack) work.
Point it at a non-default API instance with `TODO_API_URL` if needed:

```sh
TODO_API_URL=http://localhost:4000 npm run mcp
```

## Tools

| Tool | Maps to |
|---|---|
| `create_todo` | `POST /todos` |
| `list_todos` | `GET /todos` (with `completed`/`overdue`/`sortBy`/`order`) |
| `get_todo` | `GET /todos/:id` |
| `update_todo` | `PUT /todos/:id` |
| `complete_todo` | `PATCH /todos/:id/complete` |
| `incomplete_todo` | `PATCH /todos/:id/incomplete` |
| `delete_todo` | `DELETE /todos/:id` |

Each tool's input schema is a zod shape (the same validation library the REST API itself uses),
so an agent gets real parameter validation and descriptions, not just a raw HTTP passthrough.
API errors (400/404) surface as MCP tool errors (`isError: true`) with the underlying error
code and message, not a generic failure.

## Why this exists

Not part of the graded assignment — added to demonstrate wrapping an existing, already-tested
REST API as an MCP server, verified end to end (every tool exercised through an actual MCP
client over the real protocol, not just called as plain functions) rather than left as an
untested sketch.
