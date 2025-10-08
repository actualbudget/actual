"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachPluginMiddleware = attachPluginMiddleware;
/**
 * Attaches IPC communication handler to an Express app
 * This allows the plugin's Express app to receive requests from sync-server via IPC
 */
function attachPluginMiddleware(app) {
    if (!process.send) {
        console.warn('Not running as a forked process, plugin IPC will not work');
        return;
    }
    // Set up IPC message handler
    process.on('message', async (message) => {
        if (message.type !== 'request') {
            return;
        }
        try {
            // Simulate an HTTP request to the Express app
            await handleIPCRequest(app, message);
        }
        catch (error) {
            sendError(message.requestId, error instanceof Error ? error.message : 'Unknown error');
        }
    });
    // Send ready message to sync-server
    const readyMessage = { type: 'ready' };
    process.send(readyMessage);
}
/**
 * Handle an IPC request by simulating an HTTP request to the Express app
 */
async function handleIPCRequest(app, message) {
    return new Promise(resolve => {
        // Create mock request object
        const requestHeaders = message.headers;
        const mockReq = {
            method: message.method,
            path: message.path,
            url: message.path +
                (message.query && Object.keys(message.query).length > 0
                    ? '?' +
                        new URLSearchParams(message.query).toString()
                    : ''),
            headers: requestHeaders,
            query: message.query,
            body: message.body,
            params: {},
            user: message.user, // Add user info for secrets access
            pluginSlug: message.pluginSlug, // Add plugin slug for namespaced secrets
            _body: true, // Mark body as already parsed to prevent body-parser from running
            get: function (name) {
                return requestHeaders?.[name.toLowerCase()];
            },
        };
        // Create mock response object
        let responseSent = false;
        const responseHeaders = {};
        let statusCode = 200;
        const mockRes = {
            statusCode: 200,
            status: function (code) {
                statusCode = code;
                this.statusCode = code;
                return this;
            },
            setHeader: function (name, value) {
                responseHeaders[name] = value;
                return this;
            },
            getHeader: function (name) {
                return responseHeaders[name];
            },
            getHeaders: function () {
                return responseHeaders;
            },
            send: function (body) {
                if (!responseSent) {
                    responseSent = true;
                    sendResponse(message.requestId, statusCode, responseHeaders, body);
                    resolve();
                }
                return this;
            },
            json: function (body) {
                if (!responseSent) {
                    responseSent = true;
                    responseHeaders['Content-Type'] = 'application/json';
                    sendResponse(message.requestId, statusCode, responseHeaders, body);
                    resolve();
                }
                return this;
            },
            end: function (data) {
                if (!responseSent) {
                    responseSent = true;
                    sendResponse(message.requestId, statusCode, responseHeaders, data);
                    resolve();
                }
                return this;
            },
        };
        // Use Express's internal router to handle the request
        try {
            // Call the app as a function - this is how Express handles requests
            app(mockReq, mockRes, (err) => {
                if (err && !responseSent) {
                    responseSent = true;
                    sendError(message.requestId, err instanceof Error ? err.message : 'Unknown error');
                    resolve();
                }
                else if (!responseSent) {
                    // No route matched, send 404
                    responseSent = true;
                    sendResponse(message.requestId, 404, { 'Content-Type': 'application/json' }, {
                        error: 'not_found',
                        message: 'Route not found',
                    });
                    resolve();
                }
            });
        }
        catch (error) {
            if (!responseSent) {
                responseSent = true;
                sendError(message.requestId, error instanceof Error ? error.message : 'Unknown error');
                resolve();
            }
        }
    });
}
/**
 * Send a response back to sync-server via IPC
 */
function sendResponse(requestId, status, headers, body) {
    if (!process.send) {
        return;
    }
    const response = {
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
function sendError(requestId, error) {
    if (!process.send) {
        return;
    }
    const errorResponse = {
        type: 'error',
        requestId,
        error,
    };
    process.send(errorResponse);
}
