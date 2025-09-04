import * as asyncStorage from '../../platform/server/asyncStorage';
import { fetch } from '../../platform/server/fetch';
import { createApp } from '../app';
import { getServer } from '../server-config';

export interface PluginsHandlers {
  'cors-proxy': typeof corsProxy;
}

export const app = createApp<PluginsHandlers>();

app.method('cors-proxy', corsProxy);

async function corsProxy({
  url,
  method = 'GET',
  body,
  headers,
}: {
  url: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}) {
  try {
    const userToken = await asyncStorage.getItem('user-token');

    if (!userToken) {
      return { error: 'unauthorized' };
    }

    const serverConfig = getServer();
    if (!serverConfig) {
      return { error: 'no-server-configured' };
    }

    // Make the request to the sync-server CORS proxy with authentication
    const proxyUrl =
      serverConfig.CORS_PROXY + `?url=${encodeURIComponent(url)}`;

    // Prepare request headers with defaults for plugin requests
    const defaultHeaders = {
      'x-requested-with': 'actual-budget',
      'user-agent': 'Actual-Budget-Plugin-System',
    };

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'X-ACTUAL-TOKEN': userToken,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        method,
        body,
        headers: {
          ...defaultHeaders,
          ...headers,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        return JSON.parse(errorText);
      } catch {
        return { error: 'network-failure', details: errorText };
      }
    }

    const contentType = response.headers.get('content-type');

    console.log('contentType', contentType);
    console.log('url', url.toString());
    // Try to detect if this might be JSON content based on URL or content-type
    const isLikelyJson =
      contentType?.includes('application/json') ||
      url.toString().toLowerCase().includes('.json') ||
      url.toString().toLowerCase().includes('/manifest') ||
      url.toString().toLowerCase().includes('manifest.json');

    if (isLikelyJson) {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } else if (contentType?.includes('text/')) {
      // Return text responses as plain text
      const text = await response.text();
      return text;
    } else {
      // Return binary data as array buffer
      const arrayBuffer = await response.arrayBuffer();
      return {
        data: Array.from(new Uint8Array(arrayBuffer)),
        contentType,
        isBinary: true,
      };
    }
  } catch (error) {
    console.error('CORS proxy error:', error);
    return {
      error: 'network-failure',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
