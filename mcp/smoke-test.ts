#!/usr/bin/env node
/**
 * Exercises the MCP server through a real MCP client over the actual protocol
 * (stdio), against a real running API instance -- not unit-called as plain
 * functions. Exits non-zero on any assertion failure, so it's safe to wire
 * into CI, not just run by hand.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function textOf(result: { content: unknown }): string {
  return (result.content as { type: string; text: string }[])[0].text;
}

function jsonOf(result: { content: unknown }): unknown {
  return JSON.parse(textOf(result));
}

interface TodoLike {
  id: string;
  title: string;
  isCompleted: boolean;
}

async function main() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', path.join(__dirname, 'server.ts')],
  });

  const client = new Client({ name: 'mcp-smoke-test', version: '1.0.0' });
  await client.connect(transport);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((t) => t.name).sort();
  assert(
    JSON.stringify(toolNames) ===
      JSON.stringify(
        ['complete_todo', 'create_todo', 'delete_todo', 'get_todo', 'incomplete_todo', 'list_todos', 'update_todo'].sort()
      ),
    `expected 7 known tools, got: ${toolNames.join(', ')}`
  );

  const created = await client.callTool({
    name: 'create_todo',
    arguments: { title: 'smoke test', description: 'created by mcp/smoke-test.ts', dueDate: '2026-12-25' },
  });
  const createdBody = jsonOf(created) as TodoLike;
  assert(typeof createdBody.id === 'string', 'create_todo should return an id');
  assert(createdBody.title === 'smoke test', 'create_todo should echo the title');
  const id = createdBody.id;

  const listed = jsonOf(await client.callTool({ name: 'list_todos', arguments: {} })) as TodoLike[];
  assert(
    Array.isArray(listed) && listed.some((t) => t.id === id),
    'list_todos should include the created todo'
  );

  const gotten = jsonOf(await client.callTool({ name: 'get_todo', arguments: { id } })) as TodoLike;
  assert(gotten.id === id, 'get_todo should return the created todo');

  const updated = jsonOf(
    await client.callTool({ name: 'update_todo', arguments: { id, title: 'smoke test (edited)' } })
  ) as TodoLike;
  assert(updated.title === 'smoke test (edited)', 'update_todo should apply the change');

  const emptyUpdate = await client.callTool({ name: 'update_todo', arguments: { id } });
  assert(emptyUpdate.isError === true, 'update_todo with no fields should be rejected');

  const completed = jsonOf(await client.callTool({ name: 'complete_todo', arguments: { id } })) as TodoLike;
  assert(completed.isCompleted === true, 'complete_todo should set isCompleted');

  const incompleted = jsonOf(await client.callTool({ name: 'incomplete_todo', arguments: { id } })) as TodoLike;
  assert(incompleted.isCompleted === false, 'incomplete_todo should clear isCompleted');

  const notFound = await client.callTool({
    name: 'get_todo',
    arguments: { id: '00000000-0000-0000-0000-000000000000' },
  });
  assert(notFound.isError === true, 'get_todo on a missing id should be an MCP tool error');

  const deleted = await client.callTool({ name: 'delete_todo', arguments: { id } });
  assert(!deleted.isError, 'delete_todo should succeed');

  await client.close();
  console.log('MCP smoke test passed: 7 tools, full CRUD + error paths verified over the real protocol.');
  process.exit(0);
}

main().catch((err) => {
  console.error('MCP SMOKE TEST FAILED:', err);
  process.exit(1);
});
