/// <reference lib="WebWorker" />
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

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
precacheAndRoute(self.__WB_MANIFEST || [], PRECACHE_OPTIONS);

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

// Cache fonts with CacheFirst strategy
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
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
  return handlePlugin(slug, fileName.replace('?import', ''));
});

// Log installation event
self.addEventListener('install', (_event: ExtendableEvent) => {
  console.log('Plugins Worker installing...');
});

// Log activation event
self.addEventListener('activate', (_event: ExtendableEvent) => {
  self.clients.claim();

  self.clients.matchAll().then(clients => {
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
  for (const key of fileList.keys()) {
    if (key.startsWith(`${slug}/`)) {
      if (key.endsWith(`/${fileName}`)) {
        const content = fileList.get(key);
        const contentType = getContentType(fileName);
        return new Response(content, {
          headers: { 'Content-Type': contentType },
        });
      }
    }
  }

  const clientsList = await self.clients.matchAll();
  if (clientsList.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No active clients to process' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const client = clientsList[0];
  return new Promise<Response>(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (messageEvent: MessageEvent<PluginFile[]>) => {
      const responseData = messageEvent.data as PluginFile[];

      if (responseData && Array.isArray(responseData)) {
        responseData.forEach(({ name, content }) => {
          fileList.set(`${slug}/${encodeURIComponent(name)}`, content);
        });
      }

      const fileToCheck = fileName.length > 0 ? fileName : 'mf-manifest.json';

      if (fileList.has(`${slug}/${fileToCheck}`)) {
        let content = fileList.get(`${slug}/${fileToCheck}`)!;
        const contentType = getContentType(fileToCheck);
        const headers: Record<string, string> = { 'Content-Type': contentType };

        if (fileToCheck === 'mf-manifest.json') {
          try {
            const manifest = JSON.parse(content);
            if (manifest.metaData?.publicPath) {
              manifest.metaData.publicPath = `/plugin-data/${slug}/`;
              content = JSON.stringify(manifest);
            }
          } catch (error) {
            console.error(
              'Failed to parse manifest for publicPath rewrite:',
              error,
            );
          }

          headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
          headers['Pragma'] = 'no-cache';
          headers['Expires'] = '0';
        }

        resolve(new Response(content, { headers }));
      } else {
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
