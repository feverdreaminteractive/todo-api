#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE_URL = process.env.TODO_API_URL ?? 'http://localhost:3000';

interface ApiError {
  error: { message: string; code: string; issues?: unknown[] };
}

async function callApi(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = body as ApiError;
    throw new Error(`${err.error?.code ?? 'ERROR'}: ${err.error?.message ?? res.statusText}`);
  }

  return body;
}

function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

const server = new McpServer({ name: 'todo-api', version: '1.0.0' });

server.registerTool(
  'create_todo',
  {
    title: 'Create a to-do',
    description: 'Create a new to-do item.',
    inputSchema: {
      title: z.string().min(1).max(200).describe('The to-do title (required)'),
      description: z.string().max(2000).optional().describe('Optional longer description'),
      dueDate: z.string().optional().describe('Optional due date, YYYY-MM-DD'),
    },
  },
  async (args) => {
    try {
      return textResult(await callApi('/todos', { method: 'POST', body: JSON.stringify(args) }));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'list_todos',
  {
    title: 'List to-dos',
    description: 'List to-dos, optionally filtered and sorted.',
    inputSchema: {
      completed: z.boolean().optional().describe('Filter by completion status'),
      overdue: z.boolean().optional().describe('Filter to only overdue, incomplete todos'),
      sortBy: z.enum(['dueDate', 'createdAt', 'title']).optional(),
      order: z.enum(['asc', 'desc']).optional(),
    },
  },
  async (args) => {
    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined) params.set(key, String(value));
      }
      const qs = params.toString();
      return textResult(await callApi(`/todos${qs ? `?${qs}` : ''}`));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'get_todo',
  {
    title: 'Get a to-do',
    description: 'Fetch a single to-do by id.',
    inputSchema: { id: z.string().describe('The to-do id') },
  },
  async ({ id }) => {
    try {
      return textResult(await callApi(`/todos/${id}`));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'update_todo',
  {
    title: 'Update a to-do',
    description: 'Update a to-do\'s title, description, or due date (at least one field required). Cannot change completion status here -- use complete_todo/incomplete_todo instead.',
    inputSchema: {
      id: z.string().describe('The to-do id'),
      title: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).optional(),
      dueDate: z.string().optional(),
    },
  },
  async ({ id, ...rest }) => {
    try {
      return textResult(await callApi(`/todos/${id}`, { method: 'PUT', body: JSON.stringify(rest) }));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'complete_todo',
  {
    title: 'Mark a to-do complete',
    description: 'Mark a to-do as completed.',
    inputSchema: { id: z.string().describe('The to-do id') },
  },
  async ({ id }) => {
    try {
      return textResult(await callApi(`/todos/${id}/complete`, { method: 'PATCH' }));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'incomplete_todo',
  {
    title: 'Mark a to-do incomplete',
    description: 'Mark a to-do as not completed (active again).',
    inputSchema: { id: z.string().describe('The to-do id') },
  },
  async ({ id }) => {
    try {
      return textResult(await callApi(`/todos/${id}/incomplete`, { method: 'PATCH' }));
    } catch (err) {
      return errorResult(err);
    }
  }
);

server.registerTool(
  'delete_todo',
  {
    title: 'Delete a to-do',
    description: 'Permanently delete a to-do.',
    inputSchema: { id: z.string().describe('The to-do id') },
  },
  async ({ id }) => {
    try {
      await callApi(`/todos/${id}`, { method: 'DELETE' });
      return textResult({ deleted: id });
    } catch (err) {
      return errorResult(err);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`todo-api MCP server running (stdio) -- talking to ${BASE_URL}`);
}

main().catch((err) => {
  console.error('Fatal error starting MCP server:', err);
  process.exit(1);
});
