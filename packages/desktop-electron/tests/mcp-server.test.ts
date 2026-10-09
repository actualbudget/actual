import { createServer } from 'http';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleMcpHttpRequest } from '../mcp-server';
import type { McpHttpServerOptions } from '../mcp-server';

const TOKEN = 'secret-token';

describe('MCP HTTP server', () => {
  let server: Server;
  let baseUrl: string;
  let options: McpHttpServerOptions;

  beforeEach(async () => {
    options = {
      port: 0,
      token: TOKEN,
      handleMessage: vi.fn(async (message: unknown) => {
        const { id } = message as { id?: number };
        return id === undefined ? null : { jsonrpc: '2.0', id, result: {} };
      }),
    };

    server = createServer((req, res) => {
      void handleMcpHttpRequest(req, res, options);
    });
    await new Promise<void>(resolve =>
      server.listen(0, '127.0.0.1', () => resolve()),
    );
    options.port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${options.port}`;
  });

  afterEach(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  function post(body: unknown, headers: Record<string, string> = {}) {
    return fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        Authorization: `Bearer ${TOKEN}`,
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  }

  it('forwards JSON-RPC requests and returns the response', async () => {
    const response = await post({ jsonrpc: '2.0', id: 7, method: 'ping' });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');
    await expect(response.json()).resolves.toEqual({
      jsonrpc: '2.0',
      id: 7,
      result: {},
    });
    expect(options.handleMessage).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      id: 7,
      method: 'ping',
    });
  });

  it('accepts notifications with 202', async () => {
    const response = await post({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });
    expect(response.status).toBe(202);
  });

  it('rejects requests without the access token', async () => {
    const missing = await post(
      { jsonrpc: '2.0', id: 1, method: 'ping' },
      {
        Authorization: '',
      },
    );
    expect(missing.status).toBe(401);

    const wrong = await post(
      { jsonrpc: '2.0', id: 1, method: 'ping' },
      {
        Authorization: 'Bearer wrong-token!',
      },
    );
    expect(wrong.status).toBe(401);
    expect(options.handleMessage).not.toHaveBeenCalled();
  });

  it('rejects requests from web pages', async () => {
    const response = await post(
      { jsonrpc: '2.0', id: 1, method: 'ping' },
      {
        Origin: 'https://example.com',
      },
    );
    expect(response.status).toBe(403);
    expect(options.handleMessage).not.toHaveBeenCalled();
  });

  it('only serves POST requests on /mcp', async () => {
    const getResponse = await fetch(`${baseUrl}/mcp`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    expect(getResponse.status).toBe(405);

    const otherPath = await fetch(`${baseUrl}/other`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: '{}',
    });
    expect(otherPath.status).toBe(404);
  });

  it('returns a parse error for invalid JSON', async () => {
    const response = await post('{not json');
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: -32700 },
    });
  });

  it('reports when the backend is unavailable', async () => {
    vi.mocked(options.handleMessage).mockRejectedValueOnce(
      new Error('The Actual backend is not running'),
    );
    const response = await post({ jsonrpc: '2.0', id: 1, method: 'ping' });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { message: 'The Actual backend is not running' },
    });
  });
});
