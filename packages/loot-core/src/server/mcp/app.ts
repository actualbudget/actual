import { createApp } from '#server/app';
import { app as mainApp } from '#server/main-app';

import { handleMcpMessage } from './protocol';
import {
  createMcpTools,
  MCP_READ_ONLY_HANDLERS,
  MCP_SERVER_INSTRUCTIONS,
} from './tools';
import type { McpReadOnlyHandlers } from './tools';

export type McpHandlers = {
  'mcp-handle-message': typeof handleMessage;
};

export const app = createApp<McpHandlers>();

// Not wrapped in `mutator`: answering MCP messages only ever reads data.
app.method('mcp-handle-message', handleMessage);

function getReadOnlyHandlers(): McpReadOnlyHandlers {
  // Copy only the allow-listed handlers so the tools can't reach anything
  // else, even by accident.
  const handlers = {} as Record<string, unknown>;
  for (const name of MCP_READ_ONLY_HANDLERS) {
    handlers[name] = mainApp.handlers[name];
  }
  return handlers as McpReadOnlyHandlers;
}

/**
 * Answers a single MCP (JSON-RPC) message received by the desktop app's local
 * MCP endpoint. Returns `null` when the message needs no response.
 */
async function handleMessage({
  message,
  version,
}: {
  message: unknown;
  version?: string;
}) {
  return handleMcpMessage(
    {
      tools: createMcpTools(getReadOnlyHandlers()),
      version: version || 'unknown',
      instructions: MCP_SERVER_INSTRUCTIONS,
    },
    message,
  );
}
