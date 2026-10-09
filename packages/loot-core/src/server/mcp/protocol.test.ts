import { APIError } from '#server/errors';

import { handleMcpMessage, MCP_PROTOCOL_VERSIONS } from './protocol';
import type { McpServerOptions } from './protocol';

const options: McpServerOptions = {
  version: '1.2.3',
  instructions: 'Some instructions',
  tools: [
    {
      name: 'echo',
      title: 'Echo',
      description: 'Echoes its arguments',
      inputSchema: { type: 'object', properties: {} },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      run: async args => {
        if (args.fail) {
          throw new Error('It failed');
        }
        if (args.failWithObject) {
          // APIError is a plain object, not an Error instance
          throw APIError('Bad month');
        }
        return args;
      },
    },
  ],
};

describe('handleMcpMessage', () => {
  it('negotiates the protocol version on initialize', async () => {
    const response = await handleMcpMessage(options, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-03-26', capabilities: {} },
    });

    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2025-03-26',
        capabilities: { tools: { listChanged: false } },
        serverInfo: {
          name: 'actual-budget',
          title: 'Actual Budget',
          version: '1.2.3',
        },
        instructions: 'Some instructions',
      },
    });
  });

  it('falls back to the latest protocol version for unknown versions', async () => {
    const response = await handleMcpMessage(options, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '1999-01-01' },
    });

    expect(response).toMatchObject({
      result: { protocolVersion: MCP_PROTOCOL_VERSIONS[0] },
    });
  });

  it('does not answer notifications', async () => {
    await expect(
      handleMcpMessage(options, {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      }),
    ).resolves.toBeNull();
  });

  it('lists tools without their implementation', async () => {
    const response = await handleMcpMessage(options, {
      jsonrpc: '2.0',
      id: 'a',
      method: 'tools/list',
    });

    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 'a',
      result: {
        tools: [
          {
            name: 'echo',
            title: 'Echo',
            description: 'Echoes its arguments',
            inputSchema: { type: 'object', properties: {} },
            annotations: {
              readOnlyHint: true,
              destructiveHint: false,
              idempotentHint: true,
              openWorldHint: false,
            },
          },
        ],
      },
    });
  });

  it('calls a tool and returns its result as text', async () => {
    const response = await handleMcpMessage(options, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'echo', arguments: { value: 5 } },
    });

    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 2,
      result: {
        content: [{ type: 'text', text: '{"value":5}' }],
        isError: false,
      },
    });
  });

  it('reports tool failures as tool errors', async () => {
    const response = await handleMcpMessage(options, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'echo', arguments: { fail: true } },
    });

    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 3,
      result: {
        content: [{ type: 'text', text: 'Error: It failed' }],
        isError: true,
      },
    });
  });

  it('reports the message of non-Error failures', async () => {
    const response = await handleMcpMessage(options, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'echo', arguments: { failWithObject: true } },
    });

    expect(response).toMatchObject({
      result: {
        content: [{ type: 'text', text: 'Error: Bad month' }],
        isError: true,
      },
    });
  });

  it('rejects unknown tools and methods', async () => {
    await expect(
      handleMcpMessage(options, {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'delete_everything' },
      }),
    ).resolves.toMatchObject({ id: 4, error: { code: -32602 } });

    await expect(
      handleMcpMessage(options, {
        jsonrpc: '2.0',
        id: 5,
        method: 'resources/write',
      }),
    ).resolves.toMatchObject({ id: 5, error: { code: -32601 } });
  });

  it('handles parse errors, invalid requests and batches', async () => {
    await expect(handleMcpMessage(options, '{not json')).resolves.toMatchObject(
      { id: null, error: { code: -32700 } },
    );
    await expect(
      handleMcpMessage(options, { id: 1, method: 'ping' }),
    ).resolves.toMatchObject({ id: 1, error: { code: -32600 } });

    await expect(
      handleMcpMessage(options, [
        { jsonrpc: '2.0', id: 1, method: 'ping' },
        { jsonrpc: '2.0', method: 'notifications/initialized' },
      ]),
    ).resolves.toEqual([{ jsonrpc: '2.0', id: 1, result: {} }]);
  });
});
