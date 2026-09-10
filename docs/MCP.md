# MCP Server

`mcp/server.ts` exposes this API's to-do management as [Model Context Protocol](https://modelcontextprotocol.io)
tools, so an LLM agent (Claude Desktop, Claude Code, or any other MCP client) can create, list,
update, complete, and delete to-dos directly — the same pattern this role's own product uses to
wrap Shopify's API as MCP tools, just applied to this smaller API instead.

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

Not part of the graded assignment — added specifically because the role this take-home is for
builds an MCP server wrapping Shopify's API. Wrapping this project's own REST API the same way
is the most direct, literal demonstration of that exact skill available within the scope of a
take-home: a real MCP server, verified end to end (every tool exercised through an actual MCP
client over the real protocol, not just called as plain functions), talking to a real HTTP API
that already has its own layered architecture and test suite behind it.
