/// <reference lib="WebWorker" />
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import type { WorkboxPlugin } from 'workbox-core';

// Service Worker Global Types
declare const self: ServiceWorkerGlobalScope & {
  __WB_DISABLE_DEV_LOGS: boolean;
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

type PluginFile = {
  name: string;
  content: string;
};

type PluginMessage = {
  type: string;
  eventData?: {
    pluginUrl: string;
  };
};

self.__WB_DISABLE_DEV_LOGS = true;

// Keep in sync with `workbox.ignoreURLParametersMatching` in
// `packages/desktop-client/vite.config.mts`
const PRECACHE_OPTIONS = {
  ignoreURLParametersMatching: [/^v$/] as RegExp[],
};

// Injected by VitePWA
// Use empty array as fallback if __WB_MANIFEST is not injected
const manifest = self.__WB_MANIFEST || [];
console.log(`[SW Precache] Precaching ${manifest.length} assets:`, manifest);
precacheAndRoute(manifest, PRECACHE_OPTIONS);

const appShellHandler = createHandlerBoundToURL('/index.html');

const navigationRoute = new NavigationRoute(appShellHandler, {
  denylist: [
    /^\/account\/.*$/,
    /^\/admin\/.*$/,
    /^\/secret\/.*$/,
    /^\/openid\/.*$/,
    /^\/plugins\/.*$/,
  ],
});

registerRoute(navigationRoute);

// Custom logging plugin for Workbox
const loggingPlugin: WorkboxPlugin = {
  cacheWillUpdate: async ({ response, request }) => {
    console.log(
      `[SW Cache] Storing in cache: ${request.url} (status: ${response.status})`,
    );
    return response;
  },
  cachedResponseWillBeUsed: async ({ cacheName, request, cachedResponse }) => {
    if (cachedResponse) {
      console.log(
        `[SW Cache HIT] Retrieved from ${cacheName}: ${request.url}`,
      );
    } else {
      console.log(`[SW Cache MISS] Not in ${cacheName}: ${request.url}`);
    }
    return cachedResponse ?? null;
  },
  fetchDidSucceed: async ({ request, response }) => {
    console.log(
      `[SW Network] Fetched successfully: ${request.url} (status: ${response.status})`,
    );
    return response;
  },
  fetchDidFail: async ({ request, error }) => {
    console.error(`[SW Network FAIL] Failed to fetch: ${request.url}`, error);
    throw error;
  },
  handlerDidError: async ({ request, error }) => {
    console.error(`[SW Handler ERROR] ${request.url}`, error);
    return new Response('Offline fallback', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  },
};

// Cache fonts with CacheFirst strategy
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
      loggingPlugin,
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        maxEntries: 30,
      }),
    ],
  }),
);

// Cache static assets (images, icons, manifests) with CacheFirst strategy
registerRoute(
  ({ request }) =>
    request.destination === 'image' ||
    request.url.endsWith('.webmanifest') ||
    request.url.endsWith('.ico') ||
    request.url.endsWith('.png'),
  new CacheFirst({
    cacheName: 'static-assets-cache',
    plugins: [
      loggingPlugin,
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        maxEntries: 60,
      }),
    ],
  }),
);

// Cache data files with NetworkFirst strategy (fallback to cache when offline)
registerRoute(
  ({ url }) =>
    url.pathname.includes('/data/') ||
    url.pathname.endsWith('data-file-index.txt'),
  new NetworkFirst({
    cacheName: 'data-files-cache',
    plugins: [
      loggingPlugin,
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        maxEntries: 100,
      }),
    ],
  }),
);

const fileList = new Map<string, string>();

// Register a Workbox route for plugin-data requests
// This ensures Workbox's router handles all requests, including plugin-data
const pluginDataMatch = ({ url }: { url: URL }) => {
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const pluginsIndex = pathSegments.indexOf('plugin-data');
  return pluginsIndex !== -1 && pathSegments[pluginsIndex + 1] !== undefined;
};

registerRoute(pluginDataMatch, async ({ request, url }) => {
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const pluginsIndex = pathSegments.indexOf('plugin-data');
  const slugIndex = pluginsIndex + 1;
  const slug = pathSegments[slugIndex];
  const fileName =
    pathSegments.length > slugIndex + 1
      ? pathSegments[slugIndex + 1].split('?')[0]
      : '';
  console.log(`[SW Plugin] Handling plugin request: ${url.pathname}`);
  const response = await handlePlugin(slug, fileName.replace('?import', ''));
  console.log(
    `[SW Plugin] Response for ${url.pathname}: ${response.status} ${response.statusText}`,
  );
  return response;
});

// Log installation event
self.addEventListener('install', (_event: ExtendableEvent) => {
  console.log('[SW Lifecycle] Service Worker installing...');
  console.log('[SW Lifecycle] Version:', new Date().toISOString());
});

// Log activation event
self.addEventListener('activate', (_event: ExtendableEvent) => {
  console.log('[SW Lifecycle] Service Worker activated and claiming clients');
  self.clients.claim();

  self.clients.matchAll().then(clients => {
    console.log(`[SW Lifecycle] Notifying ${clients.length} client(s)`);
    clients.forEach(client => {
      client.postMessage({
        type: 'service-worker-ready',
        timestamp: Date.now(),
      });
    });
  });
});

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data && (event.data as PluginMessage).type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function handlePlugin(slug: string, fileName: string): Promise<Response> {
  console.log(`[SW Plugin] Looking for plugin file: ${slug}/${fileName}`);

  for (const key of fileList.keys()) {
    if (key.startsWith(`${slug}/`)) {
      if (key.endsWith(`/${fileName}`)) {
        console.log(`[SW Plugin Cache HIT] Found in memory: ${key}`);
        const content = fileList.get(key);
        const contentType = getContentType(fileName);
        return new Response(content, {
          headers: { 'Content-Type': contentType },
        });
      }
    }
  }

  console.log(`[SW Plugin] Not in memory cache, requesting from client`);
  const clientsList = await self.clients.matchAll();
  if (clientsList.length === 0) {
    console.warn('[SW Plugin] No active clients available');
    return new Response(
      JSON.stringify({ error: 'No active clients to process' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const client = clientsList[0];
  console.log(`[SW Plugin] Requesting plugin files from client for: ${slug}`);

  return new Promise<Response>(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (messageEvent: MessageEvent<PluginFile[]>) => {
      const responseData = messageEvent.data as PluginFile[];

      if (responseData && Array.isArray(responseData)) {
        console.log(
          `[SW Plugin] Received ${responseData.length} files from client for ${slug}`,
        );
        responseData.forEach(({ name, content }) => {
          const key = `${slug}/${encodeURIComponent(name)}`;
          fileList.set(key, content);
          console.log(
            `[SW Plugin] Stored in memory: ${key} (${content.length} bytes)`,
          );
        });
      } else {
        console.warn(
          `[SW Plugin] Received invalid response data for ${slug}`,
          responseData,
        );
      }

      const fileToCheck = fileName.length > 0 ? fileName : 'mf-manifest.json';

      if (fileList.has(`${slug}/${fileToCheck}`)) {
        console.log(
          `[SW Plugin] Successfully found requested file: ${slug}/${fileToCheck}`,
        );
        let content = fileList.get(`${slug}/${fileToCheck}`)!;
        const contentType = getContentType(fileToCheck);
        const headers: Record<string, string> = { 'Content-Type': contentType };

        if (fileToCheck === 'mf-manifest.json') {
          try {
            const manifest = JSON.parse(content);
            if (manifest.metaData?.publicPath) {
              manifest.metaData.publicPath = `/plugin-data/${slug}/`;
              content = JSON.stringify(manifest);
              console.log(
                `[SW Plugin] Rewrote publicPath in manifest for ${slug}`,
              );
            }
          } catch (error) {
            console.error(
              `[SW Plugin] Failed to parse manifest for publicPath rewrite:`,
              error,
            );
          }

          headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
          headers['Pragma'] = 'no-cache';
          headers['Expires'] = '0';
        }

        resolve(new Response(content, { headers }));
      } else {
        console.warn(
          `[SW Plugin] File not found after client response: ${slug}/${fileToCheck}`,
        );
        console.log(
          `[SW Plugin] Available files:`,
          Array.from(fileList.keys()).filter(k => k.startsWith(`${slug}/`)),
        );
        resolve(new Response('File not found', { status: 404 }));
      }
    };

    client.postMessage(
      { type: 'plugin-files', eventData: { pluginUrl: slug } },
      [channel.port2],
    );
  });
}

function getContentType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
  };
  return mimeTypes[extension] || 'application/octet-stream';
}
