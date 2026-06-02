/// <reference lib="WebWorker" />
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import { matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

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

// Injected by VitePWA
precacheAndRoute(self.__WB_MANIFEST ?? [], {
  ignoreURLParametersMatching: [/^v$/],
});

registerRoute(
  new NavigationRoute(
    async () =>
      (await matchPrecache('/index.html')) ??
      (await matchPrecache('/')) ??
      fetch('/index.html'),
    {
      denylist: [
        /^\/(?:account|admin|secret|openid|sync|gocardless|simplefin|pluggyai|enablebanking|cors-proxy|plugins-api)(?:\/.*)?$/,
        /^\/(?:mode|info|health|metrics)$/,
      ],
    },
  ),
);

registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365,
        maxEntries: 30,
      }),
    ],
  }),
);

registerRoute(
  ({ request, url }) =>
    request.destination === 'image' ||
    url.pathname.endsWith('.webmanifest') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.png'),
  new CacheFirst({
    cacheName: 'static-assets-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 30,
        maxEntries: 60,
      }),
    ],
  }),
);

registerRoute(
  ({ url }) =>
    url.pathname.includes('/data/') ||
    url.pathname.endsWith('/data-file-index.txt'),
  new NetworkFirst({
    cacheName: 'data-files-cache',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 7,
        maxEntries: 100,
      }),
    ],
  }),
);

const fileList = new Map<string, string>();

type PluginDataPath = {
  slug: string;
  fileName: string;
};

function parsePluginDataPath(pathname: string): PluginDataPath | null {
  const match = pathname.match(/^\/plugin-data\/([^/]+)(?:\/([^?]+))?/);
  if (!match) return null;

  return {
    slug: match[1],
    fileName: match[2] ?? '',
  };
}

registerRoute(
  ({ url }) => parsePluginDataPath(url.pathname) !== null,
  async ({ url }) => {
    const pluginDataPath = parsePluginDataPath(url.pathname);
    if (!pluginDataPath) {
      return new Response('Invalid plugin-data path', { status: 400 });
    }

    return handlePlugin(
      pluginDataPath.slug,
      pluginDataPath.fileName.replace('?import', ''),
    );
  },
);

self.addEventListener('install', (_event: ExtendableEvent) => {
  console.log('Plugins Worker installing...');
});

// Log activation event
self.addEventListener('activate', (_event: ExtendableEvent) => {
  void self.clients.claim();

  void self.clients.matchAll().then(clients => {
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
    void self.skipWaiting();
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
