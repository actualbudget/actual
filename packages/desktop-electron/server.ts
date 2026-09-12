import { retry as promiseRetry } from './retry';

const BACKEND_IMPORT_MAX_RETRIES = 30;

/**
 * Posted to the main process (and relayed to the renderer) when the backend
 * cannot start. Mirrors the `app-init-failure` message the web worker posts so
 * the renderer's FatalError modal can handle both the same way.
 */
export type AppInitFailurePayload = {
  type: 'app-init-failure';
  /** The folder Actual stores budgets in could not be created or accessed. */
  DocumentDirFailure?: true;
  /** The folder that could not be created (set with DocumentDirFailure). */
  path?: string;
  /** Node filesystem error code, e.g. EPERM, EACCES, ENOENT, ENOTDIR. */
  code?: string;
  /** Any other startup failure (bundle import, crash, unexpected exit). */
  BackendInitFailure?: true;
  message: string;
  stack?: string;
};

function toAppInitFailurePayload(error: unknown): AppInitFailurePayload {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  if (
    error &&
    typeof error === 'object' &&
    'type' in error &&
    error.type === 'DocumentDirError' &&
    'path' in error
  ) {
    return {
      type: 'app-init-failure',
      DocumentDirFailure: true,
      path: String(error.path),
      code: 'code' in error && error.code ? String(error.code) : undefined,
      message,
      stack,
    };
  }

  return {
    type: 'app-init-failure',
    BackendInitFailure: true,
    message,
    stack,
  };
}

function reportInitFailure(error: unknown) {
  const payload = toAppInitFailurePayload(error);
  console.error('Failed to initialize the backend:', error);
  process.parentPort.postMessage(payload);
}

const lazyLoadBackend = async (isDev: boolean) => {
  if (process.env.lootCoreScript === undefined) {
    throw new Error(
      'The environment variable `lootCoreScript` is not defined. Please define it to point to the server bundle.',
    );
  }

  let bundle;
  try {
    // These retries are primarily for dev mode, where we watch for changes in loot-core
    // In a packaged build this should always work the first time.
    bundle = await promiseRetry(
      async (retry, number) => {
        try {
          return await import(process.env.lootCoreScript!);
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
        factor: 1, // No exponential backoff
      },
    );
  } catch (error) {
    reportInitFailure(
      new Error(
        `Failed to init the server bundle after all retries: ${String(error)}`,
      ),
    );
    return;
  }

  try {
    await bundle.initApp(isDev);
  } catch (error) {
    // Don't let this become an unhandled rejection (which would kill the
    // process silently). Report it so the renderer can show the user what
    // went wrong, and stay alive so the "exit" handler in the main process
    // doesn't overwrite this more specific failure.
    reportInitFailure(error);
  }
};

const isDev = false;

// Start the app
void lazyLoadBackend(isDev);
