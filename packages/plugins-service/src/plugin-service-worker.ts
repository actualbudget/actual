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
  async ({ event, url }) => {
    const pluginDataPath = parsePluginDataPath(url.pathname);
    if (!pluginDataPath) {
      return new Response('Invalid plugin-data path', { status: 400 });
    }

    const clientId =
      'clientId' in event &&
      typeof event.clientId === 'string' &&
      event.clientId.length > 0
        ? event.clientId
        : undefined;

    console.debug('[plugin-sw] plugin-data request', {
      pathname: url.pathname,
      slug: pluginDataPath.slug,
      fileName: pluginDataPath.fileName,
      clientId,
    });

    return handlePlugin(
      pluginDataPath.slug,
      pluginDataPath.fileName.replace('?import', ''),
      clientId,
    );
  },
);

self.addEventListener('install', (_event: ExtendableEvent) => {
  console.log('Plugins Worker installing...');
});

// Log activation event
self.addEventListener('activate', (_event: ExtendableEvent) => {
  console.log('Plugins Worker activating...');
  void self.clients.claim();

  void self.clients.matchAll().then(clients => {
    console.debug('[plugin-sw] notifying clients that worker is ready', {
      clientCount: clients.length,
    });

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

async function getClientForPluginRequest(
  clientId?: string,
): Promise<Client | undefined> {
  if (clientId) {
    const client = await self.clients.get(clientId);
    if (client) {
      return client;
    }

    console.warn('[plugin-sw] requesting client was not found', { clientId });
  }

  const clientsList = await self.clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  });

  return clientsList[0];
}

async function handlePlugin(
  slug: string,
  fileName: string,
  clientId?: string,
): Promise<Response> {
  for (const key of fileList.keys()) {
    if (key.startsWith(`${slug}/`)) {
      if (key.endsWith(`/${fileName}`)) {
        const content = fileList.get(key);
        const contentType = getContentType(fileName);
        console.debug('[plugin-sw] cache hit', {
          slug,
          fileName,
          key,
          contentType,
        });
        return new Response(content, {
          headers: { 'Content-Type': contentType },
        });
      }
    }
  }

  const client = await getClientForPluginRequest(clientId);
  if (!client) {
    console.warn('[plugin-sw] no active clients for plugin-data request', {
      slug,
      fileName,
      clientId,
    });

    return new Response(
      JSON.stringify({ error: 'No active clients to process' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  return new Promise<Response>(resolve => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      console.warn('[plugin-sw] timed out waiting for plugin files response', {
        slug,
        fileName,
        clientId: client.id,
      });
      resolve(
        new Response(
          JSON.stringify({
            error: 'Timed out waiting for plugin files response',
          }),
          {
            status: 504,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
    }, 5000);

    channel.port1.onmessage = (messageEvent: MessageEvent<PluginFile[]>) => {
      clearTimeout(timeout);

      const responseData = messageEvent.data as PluginFile[];
      console.debug('[plugin-sw] received plugin files from client', {
        slug,
        requestedFileName: fileName,
        fileCount: Array.isArray(responseData) ? responseData.length : 0,
        fileNames: Array.isArray(responseData)
          ? responseData.map(file => file.name)
          : [],
      });

      if (responseData && Array.isArray(responseData)) {
        responseData.forEach(({ name, content }) => {
          fileList.set(`${slug}/${name}`, content);
        });
      }

      const fileToCheck = fileName.length > 0 ? fileName : 'mf-manifest.json';

      if (fileList.has(`${slug}/${fileToCheck}`)) {
        let content = fileList.get(`${slug}/${fileToCheck}`)!;
        const contentType = getContentType(fileToCheck);
        const headers: Record<string, string> = { 'Content-Type': contentType };
        console.debug('[plugin-sw] serving plugin file', {
          slug,
          fileToCheck,
          contentType,
          size: content.length,
        });

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
        console.warn(
          '[plugin-sw] plugin file not found after client response',
          {
            slug,
            fileToCheck,
            availableFiles: [...fileList.keys()].filter(key =>
              key.startsWith(`${slug}/`),
            ),
          },
        );
        resolve(new Response('File not found', { status: 404 }));
      }
    };

    console.debug('[plugin-sw] requesting plugin files from client', {
      slug,
      fileName,
      clientId: client.id,
    });

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
