/**
 * Tauri sidecar entry point for the loot-core backend.
 *
 * This replaces the Electron UtilityProcess-based server.ts.
 * Communication with the Tauri host process uses newline-delimited JSON
 * over stdin (incoming messages) and stdout (outgoing messages).
 *
 * Message protocol:
 *   stdin  → { "name": "...", "args": ... }         (from Tauri to backend)
 *   stdout ← { "type": "reply"|"error"|"push", ... } (from backend to Tauri)
 */

const readline = require('readline');
const path = require('path');

const BACKEND_IMPORT_MAX_RETRIES = 30;

/**
 * Send a JSON message to the Tauri host via stdout.
 */
function sendToHost(message) {
  process.stdout.write(JSON.stringify(message) + '\n');
}

/**
 * Override console methods to route through stderr so they don't
 * interfere with the JSON message protocol on stdout.
 */
const origConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

console.log = (...args) =>
  process.stderr.write('[sidecar] ' + args.join(' ') + '\n');
console.info = (...args) =>
  process.stderr.write('[sidecar:info] ' + args.join(' ') + '\n');
console.warn = (...args) =>
  process.stderr.write('[sidecar:warn] ' + args.join(' ') + '\n');
console.error = (...args) =>
  process.stderr.write('[sidecar:error] ' + args.join(' ') + '\n');

/**
 * Set up the message listener on stdin.
 * Messages from Tauri arrive as newline-delimited JSON.
 */
function setupMessageListener() {
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });

  rl.on('line', line => {
    try {
      const msg = JSON.parse(line);
      // Forward to the backend's message handler
      if (global.__actualBackendMessageHandler) {
        global.__actualBackendMessageHandler(msg);
      }
    } catch (e) {
      console.error('Failed to parse message from host:', e.message);
    }
  });

  rl.on('close', () => {
    console.info('stdin closed, shutting down sidecar');
    process.exit(0);
  });
}

/**
 * Hook into the backend's message system.
 * The loot-core backend uses process.parentPort in Electron.
 * For Tauri, we intercept messages via a global handler and
 * route outgoing messages to stdout.
 */
function setupBackendBridge() {
  // The loot-core connection module uses process.parentPort for Electron.
  // We need to provide a compatible interface.
  // This is done by patching the global `process` to add a `parentPort` shim.

  if (!process.parentPort) {
    const handlers = [];

    process.parentPort = {
      on: (event, handler) => {
        if (event === 'message') {
          handlers.push(handler);
        }
      },
      postMessage: msg => {
        // Route backend responses to stdout (Tauri host)
        sendToHost(msg);
      },
      // oxlint-disable-next-line no-empty-function -- Stub for API compatibility
      removeHandler: () => {},
    };

    // Register our message handler that forwards stdin messages to the backend
    global.__actualBackendMessageHandler = msg => {
      for (const handler of handlers) {
        handler({ data: msg });
      }
    };
  }
}

async function lazyLoadBackend(isDev) {
  if (process.env.lootCoreScript === undefined) {
    throw new Error(
      'The environment variable `lootCoreScript` is not defined. ' +
        'Please define it to point to the server bundle.',
    );
  }

  const promiseRetry = require('promise-retry');

  try {
    const bundle = await promiseRetry(
      async (retry, number) => {
        try {
          return await import(process.env.lootCoreScript);
        } catch (error) {
          console.info(
            `Loading server bundle: Attempt ${number} of ${BACKEND_IMPORT_MAX_RETRIES}`,
          );
          retry(error);
        }
      },
      {
        retries: BACKEND_IMPORT_MAX_RETRIES,
        minTimeout: 1000,
        maxTimeout: 1000,
        factor: 1,
      },
    );
    bundle.initApp(isDev);
  } catch (error) {
    console.error('Failed to init the server bundle after all retries:', error);
    throw error;
  }
}

// Set up the bridge before loading the backend
setupBackendBridge();
setupMessageListener();

// Parse args: --subprocess <version>
const args = process.argv.slice(2);
const isDev = process.env.NODE_ENV === 'development';

// Start the backend
lazyLoadBackend(isDev).catch(error => {
  console.error('Fatal: backend failed to start:', error);
  process.exit(1);
});
