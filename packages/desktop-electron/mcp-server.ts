import { createServer } from 'http';
import type { IncomingMessage, Server, ServerResponse } from 'http';
import { timingSafeEqual } from 'node:crypto';

// Local HTTP transport for Actual's read-only MCP server (Model Context
// Protocol, "Streamable HTTP" transport with plain JSON responses). The
// protocol itself is implemented by the backend (loot-core); this server only
// authenticates requests and passes the JSON-RPC messages through.

export const DEFAULT_MCP_PORT = 5008;
export const MCP_PATH = '/mcp';
const MAX_BODY_BYTES = 1024 * 1024;

export type McpMessageHandler = (message: unknown) => Promise<unknown>;

export type McpHttpServerOptions = {
  port: number;
  token: string;
  handleMessage: McpMessageHandler;
  host?: string;
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function sendJsonRpcError(
  res: ServerResponse,
  status: number,
  code: number,
  message: string,
) {
  sendJson(res, status, { jsonrpc: '2.0', id: null, error: { code, message } });
}

function isAuthorized(req: IncomingMessage, token: string) {
  const header = req.headers.authorization;
  if (!token || typeof header !== 'string') {
    return false;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) {
    return false;
  }
  const expected = Buffer.from(token);
  const received = Buffer.from(match[1]);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

// Protects against DNS rebinding: a web page must not be able to reach the
// server through a hostname that resolves to 127.0.0.1.
function isAllowedHost(req: IncomingMessage, port: number) {
  const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  if (!allowedHosts.includes(req.headers.host ?? '')) {
    return false;
  }

  const origin = req.headers.origin;
  if (origin === undefined) {
    return true;
  }
  return allowedHosts.some(host => origin === `http://${host}`);
}

function readBody(req: IncomingMessage) {
  return new Promise<string | null>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () =>
      resolve(tooLarge ? null : Buffer.concat(chunks).toString('utf8')),
    );
    req.on('error', reject);
  });
}

export async function handleMcpHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  { port, token, handleMessage }: McpHttpServerOptions,
) {
  if (!isAllowedHost(req, port)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  const pathname = new URL(req.url || '/', `http://127.0.0.1:${port}`).pathname;
  if (pathname !== MCP_PATH && pathname !== `${MCP_PATH}/`) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }

  if (!isAuthorized(req, token)) {
    res.setHeader('WWW-Authenticate', 'Bearer');
    sendJson(res, 401, { error: 'Unauthorized' });
    return;
  }

  // Only plain JSON responses are supported: there is no server-initiated
  // stream (GET) and no sessions to end (DELETE).
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const body = await readBody(req);
  if (body === null) {
    sendJsonRpcError(res, 413, -32600, 'Request body is too large');
    return;
  }

  let message: unknown;
  try {
    message = JSON.parse(body);
  } catch {
    sendJsonRpcError(res, 400, -32700, 'Parse error');
    return;
  }

  let response: unknown;
  try {
    response = await handleMessage(message);
  } catch (error) {
    sendJsonRpcError(
      res,
      503,
      -32603,
      error instanceof Error ? error.message : String(error),
    );
    return;
  }

  if (response === null || response === undefined) {
    res.writeHead(202);
    res.end();
    return;
  }

  sendJson(res, 200, response);
}

export function startMcpHttpServer(options: McpHttpServerOptions) {
  const host = options.host ?? '127.0.0.1';
  return new Promise<Server>((resolve, reject) => {
    const server = createServer((req, res) => {
      handleMcpHttpRequest(req, res, options).catch((error: unknown) => {
        if (!res.headersSent) {
          sendJsonRpcError(res, 500, -32603, String(error));
        } else {
          res.end();
        }
      });
    });

    server.once('error', reject);
    server.listen(options.port, host, () => {
      server.off('error', reject);
      resolve(server);
    });
  });
}

export function stopMcpHttpServer(server: Server) {
  return new Promise<void>(resolve => {
    server.close(() => resolve());
    server.closeAllConnections();
  });
}
