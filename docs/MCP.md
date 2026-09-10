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

## Connecting it to Claude Desktop

Claude Desktop is a GUI app and doesn't inherit your shell's `PATH` or use your shell config
(`.zshrc`, `.bashrc`, nvm/volta/fnm setup, etc.) — so a config that just says `"command": "npx"`
often fails with "Server disconnected" because the app can't find `npx` or the `node` it needs.
The steps below use *your* actual paths, not a guessed default, so this works regardless of how
you installed Node.

**1. Find your own paths.** In your normal terminal (the one you'd run `npm run dev` from):

```sh
which npx      # e.g. /usr/local/bin/npx, or ~/.volta/bin/npx, or ~/.nvm/versions/node/.../bin/npx
echo $PATH     # your full PATH — copy this whole value for step 3
```

**2. Open Claude Desktop's config file** (create it if it doesn't exist):

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

**3. Add a `todo-api` entry**, using the `which npx` output from step 1 as `command`, this
project's absolute path to `mcp/server.ts`, and the `echo $PATH` output from step 1 as `env.PATH`:

```json
{
  "mcpServers": {
    "todo-api": {
      "command": "/usr/local/bin/npx",
      "args": ["tsx", "/absolute/path/to/todo-api/mcp/server.ts"],
      "env": {
        "PATH": "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
      }
    }
  }
}
```

If `claude_desktop_config.json` already has other `mcpServers` entries, add `todo-api` alongside
them rather than replacing the file — the example above is the whole file only if you don't
already have one.

**4. Keep the API running separately** — the MCP server is a thin proxy over HTTP, it doesn't
start the API itself:

```sh
npm run dev
```

**5. Fully quit and reopen Claude Desktop** (not just close the window) so it re-reads the
config, then start a new chat. It should show `todo-api` as a connected server, and you can just
ask it to manage your to-dos in plain English — see [Example prompts](#example-prompts) below.

**If it still shows "Failed" / "Server disconnected":** check
`~/Library/Logs/Claude/mcp-server-todo-api.log` for the actual startup error — it's far more
informative than the UI's generic message. A `npm warn exec ... will be installed` followed by a
timeout on the *first* attempt is normal (`npx` fetching `tsx` fresh); a second attempt right
after should connect immediately once it's cached.

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

## Example prompts

Be explicit about wanting an action taken — pasting a plain list of items can read as sharing
information rather than a request, and the model will just respond conversationally without
calling anything. Framing it as a request gets the tool called:

- "Add a todo to buy milk, due this Friday"
- "Add these as todos: buy milk, call mom, walk the dog"
- "What's on my to-do list?"
- "What's overdue?"
- "Mark the milk one as done"
- "Change the due date on that to next Monday"
- "Delete the walk-the-dog one"

Most MCP clients show an expandable indicator (e.g. a small tool icon) on any response where a
tool was actually called — if you don't see that, the model didn't invoke `todo-api`, regardless
of what it said back.

## Verified in CI, not just manually

`mcp/smoke-test.ts` runs on every push and PR: CI builds the app, starts the real API from
`dist/`, then spawns the actual MCP server as a real MCP client would and exercises all 7 tools
over the genuine protocol — full CRUD, the completion toggle, and both error paths (the
empty-update rejection, and a not-found lookup). It exits non-zero on any assertion failure, so
a regression here fails the build the same way a broken unit test would, not just a manual
`npm run mcp` someone forgot to run.

## Why this exists

Not part of the graded assignment — added to demonstrate wrapping an existing, already-tested
REST API as an MCP server, verified end to end (every tool exercised through an actual MCP
client over the real protocol, not just called as plain functions) rather than left as an
untested sketch.
