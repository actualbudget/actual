// A minimal, dependency-free implementation of the Model Context Protocol
// (https://modelcontextprotocol.io) message layer. It only understands the
// parts of the protocol a tools-only server needs: the initialize handshake,
// ping, and listing/calling tools. The transport (HTTP) lives in the desktop
// app; this module turns one JSON-RPC message into its response.

export const MCP_PROTOCOL_VERSIONS = [
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
] as const;

export const MCP_SERVER_NAME = 'actual-budget';

const JSON_RPC_PARSE_ERROR = -32700;
const JSON_RPC_INVALID_REQUEST = -32600;
const JSON_RPC_METHOD_NOT_FOUND = -32601;
const JSON_RPC_INVALID_PARAMS = -32602;

type JsonRpcId = string | number | null;

export type JsonRpcResponse =
  | { jsonrpc: '2.0'; id: JsonRpcId; result: unknown }
  | {
      jsonrpc: '2.0';
      id: JsonRpcId;
      error: { code: number; message: string };
    };

export type McpToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  annotations: {
    readOnlyHint: true;
    destructiveHint: false;
    idempotentHint: true;
    openWorldHint: false;
  };
};

export type McpTool = McpToolDefinition & {
  run: (args: Record<string, unknown>) => Promise<unknown>;
};

export type McpServerOptions = {
  tools: McpTool[];
  version: string;
  instructions?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function errorResponse(
  id: JsonRpcId,
  code: number,
  message: string,
): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function toolResult(value: unknown, isError = false) {
  const text =
    typeof value === 'string' ? value : JSON.stringify(value ?? null);
  return { content: [{ type: 'text', text }], isError };
}

// Some server errors (e.g. APIError) are plain objects with a message rather
// than Error instances.
function errorMessage(error: unknown) {
  if (isObject(error) && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  return String(error);
}

async function callTool(
  options: McpServerOptions,
  params: Record<string, unknown>,
) {
  const tool = options.tools.find(t => t.name === params.name);
  if (!tool) {
    return null;
  }

  const args = isObject(params.arguments) ? params.arguments : {};
  try {
    return toolResult(await tool.run(args));
  } catch (error) {
    // Tool failures are reported to the model (not as protocol errors) so it
    // can correct its arguments and retry.
    return toolResult(`Error: ${errorMessage(error)}`, true);
  }
}

async function handleRequest(
  options: McpServerOptions,
  id: JsonRpcId,
  method: string,
  params: Record<string, unknown>,
): Promise<JsonRpcResponse> {
  switch (method) {
    case 'initialize': {
      const requested = params.protocolVersion;
      const protocolVersion = MCP_PROTOCOL_VERSIONS.find(
        version => version === requested,
      );
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: protocolVersion ?? MCP_PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: {
            name: MCP_SERVER_NAME,
            title: 'Actual Budget',
            version: options.version,
          },
          ...(options.instructions
            ? { instructions: options.instructions }
            : {}),
        },
      };
    }
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };
    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: options.tools.map(
            ({ run: _run, ...definition }) => definition,
          ),
        },
      };
    case 'tools/call': {
      if (typeof params.name !== 'string') {
        return errorResponse(id, JSON_RPC_INVALID_PARAMS, 'Missing tool name');
      }
      const result = await callTool(options, params);
      if (!result) {
        return errorResponse(
          id,
          JSON_RPC_INVALID_PARAMS,
          `Unknown tool: ${params.name}`,
        );
      }
      return { jsonrpc: '2.0', id, result };
    }
    default:
      return errorResponse(
        id,
        JSON_RPC_METHOD_NOT_FOUND,
        `Method not found: ${method}`,
      );
  }
}

async function handleSingleMessage(
  options: McpServerOptions,
  message: unknown,
): Promise<JsonRpcResponse | null> {
  if (
    !isObject(message) ||
    message.jsonrpc !== '2.0' ||
    typeof message.method !== 'string'
  ) {
    // Responses sent by the client (we never send requests) are ignored.
    if (isObject(message) && ('result' in message || 'error' in message)) {
      return null;
    }
    const id =
      isObject(message) &&
      (typeof message.id === 'string' || typeof message.id === 'number')
        ? message.id
        : null;
    return errorResponse(id, JSON_RPC_INVALID_REQUEST, 'Invalid request');
  }

  // Notifications (no id) never get a response.
  if (!('id' in message) || message.id === undefined) {
    return null;
  }

  const id = message.id;
  if (typeof id !== 'string' && typeof id !== 'number') {
    return errorResponse(null, JSON_RPC_INVALID_REQUEST, 'Invalid request id');
  }

  const params = isObject(message.params) ? message.params : {};
  return handleRequest(options, id, message.method, params);
}

/**
 * Handles one MCP message (a JSON-RPC request, notification or batch) and
 * returns the response to send back, or `null` when there is nothing to send
 * (the transport should then answer with HTTP 202 Accepted).
 */
export async function handleMcpMessage(
  options: McpServerOptions,
  message: unknown,
): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  if (typeof message === 'string') {
    try {
      message = JSON.parse(message);
    } catch {
      return errorResponse(null, JSON_RPC_PARSE_ERROR, 'Parse error');
    }
  }

  if (Array.isArray(message)) {
    if (message.length === 0) {
      return errorResponse(null, JSON_RPC_INVALID_REQUEST, 'Empty batch');
    }
    const responses: JsonRpcResponse[] = [];
    for (const item of message) {
      const response = await handleSingleMessage(options, item);
      if (response) {
        responses.push(response);
      }
    }
    return responses.length > 0 ? responses : null;
  }

  return handleSingleMessage(options, message);
}
