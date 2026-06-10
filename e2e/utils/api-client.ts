import { type APIRequestContext } from '@playwright/test';

/**
 * ApiClient wraps Playwright's `APIRequestContext` for any HTTP interactions
 * with the Actual Budget application.
 *
 * Actual Budget is a local-first SQLite application. Its primary interface is
 * the browser UI; there is no public REST API that supports full CRUD for
 * accounts or transactions during tests. Where available, use `ApiClient`
 * for lightweight checks (health, server readiness). All test data setup and
 * teardown must use the UI via page objects.
 *
 * If a sync server is running (E2E_SYNC_SERVER_URL), some server-side
 * endpoints become available and can be exercised here.
 */
export class ApiClient {
  private readonly request: APIRequestContext;
  private readonly baseUrl: string;

  constructor(request: APIRequestContext, baseUrl: string) {
    this.request = request;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  // ─── Liveness ────────────────────────────────────────────────────────────────

  /**
   * Checks whether the Vite dev server (or built static server) is reachable.
   * Useful in `beforeAll` hooks to fail fast before attempting UI setup.
   */
  async isAppReachable(): Promise<boolean> {
    try {
      const response = await this.request.get(this.baseUrl, {
        timeout: 5_000,
        failOnStatusCode: false,
      });
      return response.ok();
    } catch {
      return false;
    }
  }

  /**
   * Checks the sync-server health endpoint if a sync server URL is configured.
   * Returns `null` when no sync server is configured.
   */
  async syncServerHealth(): Promise<SyncServerHealthResponse | null> {
    const serverUrl = process.env.E2E_SYNC_SERVER_URL;
    if (!serverUrl) return null;

    const response = await this.request.get(`${serverUrl}/health`, {
      timeout: 5_000,
      failOnStatusCode: false,
    });

    if (!response.ok()) return null;

    return response.json() as Promise<SyncServerHealthResponse>;
  }

  // ─── Static assets ───────────────────────────────────────────────────────────

  /**
   * Fetches the app shell HTML and returns the response status.
   * A 200 confirms the static server is correctly serving the SPA.
   */
  async getAppShellStatus(): Promise<number> {
    const response = await this.request.get(this.baseUrl, { failOnStatusCode: false });
    return response.status();
  }
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface SyncServerHealthResponse {
  status: 'ok' | 'degraded';
  uptime?: number;
  version?: string;
}
