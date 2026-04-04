/**
 * Tauri e2e test fixtures using tauri-driver (WebDriver protocol).
 *
 * tauri-driver wraps the platform's native WebDriver (WebKitWebDriver on
 * Linux) to automate the Tauri application's webview. Tests interact with
 * the real Tauri window via WebDriver HTTP API.
 *
 * In debug mode, the Tauri binary uses `devUrl` (localhost:3001) so we
 * spin up a simple static file server for the built frontend.
 */
import fs from 'node:fs';
import { type ChildProcess, spawn } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { createConnection } from 'node:net';
import path from 'node:path';

import { test as base, expect } from '@playwright/test';
import type { TestInfo } from '@playwright/test';
import { ensureDir, remove } from 'fs-extra';

const TAURI_BINARY = path.resolve(
  __dirname,
  '../src-tauri/target/debug/actual-desktop',
);

const DRIVER_PORT = 4444;
const FRONTEND_PORT = 3001;
const FRONTEND_DIR = path.resolve(
  __dirname,
  '../../desktop-client/build-tauri',
);

/** Wait until a TCP port is accepting connections. */
function waitForPort(port: number, timeout = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const socket = createConnection({ port, host: '127.0.0.1' }, () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error(`Timed out waiting for port ${port}`));
        } else {
          setTimeout(check, 200);
        }
      });
    };
    check();
  });
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
};

/** Start a simple static file server for the built frontend. */
function startStaticServer(dir: string, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      // Add COOP header (COEP omitted to avoid blocking asset loads)
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

      let urlPath = req.url?.split('?')[0] || '/';
      if (urlPath === '/') urlPath = '/index.html';

      const filePath = path.join(dir, urlPath);

      // Prevent directory traversal
      if (!filePath.startsWith(dir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      const fileExists = fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory();
      if (!fileExists) {
        // SPA fallback: serve index.html for any unknown path
        const indexPath = path.join(dir, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          fs.createReadStream(indexPath).pipe(res);
          return;
        }
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath);
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    });

    server.listen(port, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

/** Thin wrapper around the WebDriver HTTP API. */
class WebDriverSession {
  constructor(
    private port: number,
    public sessionId: string,
  ) {}

  private async request(
    method: string,
    urlPath: string,
    body?: unknown,
  ): Promise<unknown> {
    const url = `http://127.0.0.1:${this.port}/session/${this.sessionId}${urlPath}`;
    const response = await fetch(url, {
      method,
      ...(body !== undefined && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    });
    const json = (await response.json()) as { value: unknown };
    return json.value;
  }

  async screenshot(): Promise<Buffer> {
    const base64 = (await this.request('GET', '/screenshot')) as string;
    return Buffer.from(base64, 'base64');
  }

  async getTitle(): Promise<string> {
    return (await this.request('GET', '/title')) as string;
  }

  async findElement(
    using: 'css selector' | 'xpath' | 'link text',
    value: string,
  ): Promise<string> {
    const result = (await this.request('POST', '/element', {
      using,
      value,
    })) as Record<string, string>;
    return Object.values(result)[0];
  }

  async clickElement(elementId: string): Promise<void> {
    await this.request('POST', `/element/${elementId}/click`, {});
  }

  async getElementText(elementId: string): Promise<string> {
    return (await this.request(
      'GET',
      `/element/${elementId}/text`,
    )) as string;
  }

  async executeScript(script: string, args: unknown[] = []): Promise<unknown> {
    return this.request('POST', '/execute/sync', { script, args });
  }

  async close(): Promise<void> {
    try {
      await fetch(
        `http://127.0.0.1:${this.port}/session/${this.sessionId}`,
        { method: 'DELETE' },
      );
    } catch {
      // Session may already be closed
    }
  }
}

type TauriFixtures = {
  tauriSession: WebDriverSession;
};

export const test = base.extend<TauriFixtures>({
  // oxlint-disable-next-line no-empty-pattern
  tauriSession: async ({}, use, testInfo: TestInfo) => {
    const uniqueTestId = testInfo.testId.replace(/[^\w-]/g, '-');
    const testDataDir = path.resolve('e2e/data/', uniqueTestId);

    await remove(testDataDir);
    await ensureDir(testDataDir);

    // Start static file server for the built frontend (Tauri debug mode
    // loads from devUrl which is localhost:3001)
    const staticServer = await startStaticServer(FRONTEND_DIR, FRONTEND_PORT);
    // Verify server is responding
    await waitForPort(FRONTEND_PORT, 5000);
    console.log(`[fixture] Static server started on port ${FRONTEND_PORT}, serving ${FRONTEND_DIR}`);

    // Start tauri-driver (WebDriver server)
    const driverProcess: ChildProcess = spawn(
      'tauri-driver',
      ['--port', String(DRIVER_PORT)],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );

    driverProcess.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.error(`[tauri-driver] ${msg}`);
    });

    await waitForPort(DRIVER_PORT, 15000);

    // Create a WebDriver session — this launches the Tauri binary
    const response = await fetch(
      `http://127.0.0.1:${DRIVER_PORT}/session`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capabilities: {
            alwaysMatch: {
              'tauri:options': {
                application: TAURI_BINARY,
                args: [],
                env: {
                  ACTUAL_DOCUMENT_DIR: testDataDir,
                  ACTUAL_DATA_DIR: testDataDir,
                  WEBKIT_DISABLE_DMABUF_RENDERER: '1',
                },
              },
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const errBody = await response.text();
      driverProcess.kill();
      staticServer.close();
      throw new Error(`WebDriver session failed: ${errBody}`);
    }

    const sessionData = (await response.json()) as {
      value: { sessionId: string };
    };

    const session = new WebDriverSession(
      DRIVER_PORT,
      sessionData.value.sessionId,
    );

    await use(session);

    // Cleanup
    await session.close();
    driverProcess.kill();
    staticServer.close();
    await remove(testDataDir);
  },
});

export { expect };
