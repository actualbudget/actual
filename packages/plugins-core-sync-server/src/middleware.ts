import { Express, Request, Response } from 'express';

import {
  PluginRequest,
  PluginResponse,
  PluginError,
  PluginReady,
} from './types';

/**
 * Attaches IPC communication handler to an Express app
 * This allows the plugin's Express app to receive requests from sync-server via IPC
 */
export function attachPluginMiddleware(app: Express): void {
  if (!process.send) {
    console.warn('Not running as a forked process, plugin IPC will not work');
    return;
  }

  // Set up IPC message handler
  process.on('message', async (message: PluginRequest) => {
    if (message.type !== 'request') {
      return;
    }

    try {
      // Simulate an HTTP request to the Express app
      await handleIPCRequest(app, message);
    } catch (error) {
      sendError(
        message.requestId,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  });

  // Send ready message to sync-server
  const readyMessage: PluginReady = { type: 'ready' };
  process.send(readyMessage);
}

/**
 * Handle an IPC request by simulating an HTTP request to the Express app
 */
async function handleIPCRequest(
  app: Express,
  message: PluginRequest,
): Promise<void> {
  return new Promise(resolve => {
    // Create mock request object
    const requestHeaders = message.headers as Record<string, string>;
    const mockReq = {
      method: message.method,
      path: message.path,
      url:
        message.path +
        (message.query && Object.keys(message.query).length > 0
          ? '?' +
            new URLSearchParams(
              message.query as Record<string, string>,
            ).toString()
          : ''),
      headers: requestHeaders,
      query: message.query,
      body: message.body,
      params: {},
      user: message.user, // Add user info for secrets access
      pluginSlug: message.pluginSlug, // Add plugin slug for namespaced secrets
      _body: true, // Mark body as already parsed to prevent body-parser from running
      get: function (name: string): string | undefined {
        return requestHeaders?.[name.toLowerCase()];
      },
    } as unknown as Request;

    // Create mock response object
    let responseSent = false;
    const responseHeaders: Record<string, string | string[]> = {};
    let statusCode = 200;

    const mockRes: Partial<Response> = {
      statusCode: 200,

      status: function (code: number) {
        statusCode = code;
        this.statusCode = code;
        return this as Response;
      },

      setHeader: function (name: string, value: string | string[]) {
        responseHeaders[name] = value;
        return this as Response;
      },

      getHeader: function (
        name: string,
      ): string | number | string[] | undefined {
        return responseHeaders[name];
      },

      getHeaders: function () {
        return responseHeaders;
      },

      send: function (body: unknown) {
        if (!responseSent) {
          responseSent = true;
          sendResponse(message.requestId, statusCode, responseHeaders, body);
          resolve();
        }
        return this as Response;
      },

      json: function (body: unknown) {
        if (!responseSent) {
          responseSent = true;
          responseHeaders['Content-Type'] = 'application/json';
          sendResponse(message.requestId, statusCode, responseHeaders, body);
          resolve();
        }
        return this as Response;
      },

      end: function (data?: unknown) {
        if (!responseSent) {
          responseSent = true;
          sendResponse(message.requestId, statusCode, responseHeaders, data);
          resolve();
        }
        return this as Response;
      },
    };

    // Use Express's internal router to handle the request
    try {
      // Call the app as a function - this is how Express handles requests
      (
        app as unknown as (
          req: Request,
          res: Response,
          next: (err?: unknown) => void,
        ) => void
      )(mockReq, mockRes as Response, (err?: unknown) => {
        if (err && !responseSent) {
          responseSent = true;
          sendError(
            message.requestId,
            err instanceof Error ? err.message : 'Unknown error',
          );
          resolve();
        } else if (!responseSent) {
          // No route matched, send 404
          responseSent = true;
          sendResponse(
            message.requestId,
            404,
            { 'Content-Type': 'application/json' },
            {
              error: 'not_found',
              message: 'Route not found',
            },
          );
          resolve();
        }
      });
    } catch (error) {
      if (!responseSent) {
        responseSent = true;
        sendError(
          message.requestId,
          error instanceof Error ? error.message : 'Unknown error',
        );
        resolve();
      }
    }
  });
}

/**
 * Send a response back to sync-server via IPC
 */
function sendResponse(
  requestId: string,
  status: number,
  headers: Record<string, string | string[]>,
  body: unknown,
): void {
  if (!process.send) {
    return;
  }

  const response: PluginResponse = {
    type: 'response',
    requestId,
    status,
    headers,
    body,
  };

  process.send(response);
}

/**
 * Send an error back to sync-server via IPC
 */
function sendError(requestId: string, error: string): void {
  if (!process.send) {
    return;
  }

  const errorResponse: PluginError = {
    type: 'error',
    requestId,
    error,
  };

  process.send(errorResponse);
}
