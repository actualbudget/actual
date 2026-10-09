import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';

export async function createOAuthListener({
  onCallback,
  port = 3010,
  timeout = 300_000,
}: {
  onCallback: (params: URLSearchParams) => Promise<void>;
  port?: number;
  timeout?: number;
}) {
  const nonce = randomBytes(32).toString('base64url');
  let busy = false;
  let closed = false;
  let closing: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout>;
  let origin: string;
  const server = createServer(async (req, res) => {
    let callback: URL;
    try {
      callback = new URL(req.url || '/', origin);
    } catch {
      res.writeHead(400).end('Invalid login callback.');
      return;
    }
    const code = callback.searchParams.get('code');
    const state = callback.searchParams.get('state');
    if (
      closed ||
      req.method !== 'GET' ||
      req.headers.host !== new URL(origin).host ||
      callback.origin !== origin ||
      callback.pathname !== '/openid-cb' ||
      callback.searchParams.get('nonce') !== nonce ||
      !code ||
      !/^[A-Za-z0-9_-]{43}$/.test(code) ||
      !state ||
      !/^[A-Za-z0-9_-]{43}$/.test(state)
    ) {
      res.writeHead(400).end('Invalid login callback.');
      return;
    }
    if (busy) {
      res.writeHead(409).end('Login completion is already in progress.');
      return;
    }
    busy = true;
    try {
      await onCallback(new URLSearchParams({ code, state, nonce }));
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store',
      });
      res.end('Return to Actual to finish signing in.');
    } catch {
      busy = false;
      res.writeHead(500).end('Unable to return to Actual. Try again.');
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Unable to start login listener');
  }
  origin = `http://localhost:${address.port}`;

  async function close() {
    if (closed) {
      return closing;
    }
    closed = true;
    clearTimeout(timer);
    closing = new Promise<void>(resolve => server.close(() => resolve()));
    server.closeAllConnections();
    return closing;
  }

  timer = setTimeout(() => void close(), timeout);
  timer.unref();
  return {
    url: `${origin}?nonce=${nonce}`,
    close,
    async complete(callbackNonce: string, success: boolean) {
      if (callbackNonce !== nonce || !busy || closed) {
        return;
      }
      if (success === true) {
        await close();
      } else {
        busy = false;
      }
    },
  };
}
