/// <reference lib="WebWorker" />
import { precacheAndRoute } from 'workbox-precaching';

// Service Worker Global Types
declare const self: ServiceWorkerGlobalScope & {
  __WB_DISABLE_DEV_LOGS: boolean;
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
precacheAndRoute(self.__WB_MANIFEST);

const fileList = new Map<string, string>();

self.addEventListener('install', (event: ExtendableEvent) => {
  // Take control immediately instead of waiting
  console.log('Plugins Worker installing...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  // Claim all clients immediately
  event.waitUntil(self.clients.claim());

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

self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean); // Split and remove empty segments

  const pluginsIndex = pathSegments.indexOf('plugin-data');
  const slugIndex = pluginsIndex + 1;

  // Only intercept plugin-data requests
  if (pluginsIndex !== -1 && pathSegments[slugIndex]) {
    const slug = pathSegments[slugIndex];
    const fileName =
      pathSegments.length > slugIndex + 1
        ? pathSegments[slugIndex + 1].split('?')[0]
        : '';

    // IMPORTANT: Respond with cache-first strategy for plugin files
    event.respondWith(handlePlugin(slug, fileName.replace('?import', '')));
  } else {
    // For non-plugin requests, try network first, then let workbox handle it
    // If both fail (offline), return a graceful error instead of ERR_INTERNET_DISCONNECTED
    event.respondWith(
      fetch(event.request).catch(() => {
        // If fetch fails (offline), check if it's in the cache
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Not in cache, return appropriate error based on request type
          if (event.request.destination === 'document') {
            // For HTML pages, return a minimal offline page
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' },
            });
          }
          // For other resources, return empty response to prevent console errors
          return new Response(null, {
            status: 503,
            statusText: 'Service Unavailable',
          });
        });
      }),
    );
  }
});

async function handlePlugin(slug: string, fileName: string): Promise<Response> {
  // First check if we have it cached
  const fileKey = `${slug}/${fileName}`;

  if (fileName && fileList.has(fileKey)) {
    const content = fileList.get(fileKey);
    const contentType = getContentType(fileName);
    return new Response(content, {
      headers: { 'Content-Type': contentType },
    });
  }

  // Not in cache, fetch from client
  const clientsList = await self.clients.matchAll();
  if (clientsList.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No active clients to process' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const client = clientsList[0];

  return new Promise<Response>((resolve, reject) => {
    const channel = new MessageChannel();

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      reject(new Error('Plugin request timeout'));
    }, 5000);

    channel.port1.onmessage = (messageEvent: MessageEvent<PluginFile[]>) => {
      clearTimeout(timeout);
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
          } catch {
            // Failed to parse manifest, use original content
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
  }).catch(() => {
    // If timeout or error, return 503
    return new Response('Service unavailable', { status: 503 });
  });
}

function getContentType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    txt: 'text/plain',
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
