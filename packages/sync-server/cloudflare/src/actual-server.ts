import { httpServerHandler } from 'cloudflare:node';
import { DurableObject } from 'cloudflare:workers';

import packageJson from '#package.json';
import { setWorkerdRuntime } from '#workerd/runtime';
import type { WorkerdEnv } from '#workerd/runtime';

const EXPRESS_PORT = 8080;

type FetchHandler = NonNullable<ReturnType<typeof httpServerHandler>['fetch']>;

let handlerPromise: Promise<FetchHandler> | null = null;

/**
 * Runs migrations, then builds the Express app and starts it on the Workers
 * virtual HTTP server. Mirrors app.ts in the Node build: migrations must run
 * before the app modules are imported.
 */
async function startServer(): Promise<FetchHandler> {
  const { run: runMigrations } = await import('#migrations');
  await runMigrations();

  const { createApp, setupOpenIdFromConfig } = await import('#create-app');
  await setupOpenIdFromConfig();

  const app = createApp();

  app.get('/info', (_req, res) => {
    res.status(200).json({
      build: {
        name: packageJson.name,
        description: packageJson.description,
        version: packageJson.version,
      },
    });
  });

  app.get('/metrics', (_req, res) => {
    // Memory and uptime aren't meaningful for a Durable Object.
    res.status(200).json({
      mem: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 },
      uptime: 0,
    });
  });

  app.listen(EXPRESS_PORT);
  const { fetch } = httpServerHandler({ port: EXPRESS_PORT });
  if (!fetch) {
    throw new Error('httpServerHandler returned no fetch handler');
  }
  return fetch;
}

/**
 * The whole sync server, as a single Durable Object: the account database
 * is this object's SQLite storage, and the Express app runs inside it.
 */
export class ActualServer extends DurableObject<Env> {
  #handler: FetchHandler | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // The server's config (convict) reads ACTUAL_* settings from
    // process.env. Copy vars and secrets over before it is first imported.
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === 'string' && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }

    setWorkerdRuntime({
      storage: ctx.storage,
      env: env as unknown as WorkerdEnv,
    });

    void ctx.blockConcurrencyWhile(async () => {
      handlerPromise ??= startServer();
      this.#handler = await handlerPromise;
    });
  }

  // Requests arrive from our own Worker, so they carry its incoming `cf`
  // properties.
  override async fetch(
    request: Parameters<FetchHandler>[0],
  ): Promise<Response> {
    if (!this.#handler) {
      throw new Error('ActualServer failed to start');
    }
    // httpServerHandler is written for a Worker's fetch(); a Durable Object
    // state provides the waitUntil() it relies on, but not the Worker-only
    // passThroughOnException()/tracing members, so the types don't line up.
    const executionContext = this.ctx as unknown as Parameters<FetchHandler>[2];
    return this.#handler(request, this.env, executionContext);
  }
}
