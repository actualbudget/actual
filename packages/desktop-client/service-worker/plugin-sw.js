import { precacheAndRoute } from 'workbox-precaching';

// Injected by VitePWA
precacheAndRoute(self.__WB_MANIFEST);

const fileList = new Map();

// Log installation event
// eslint-disable-next-line @typescript-eslint/no-unused-vars
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  self.skipWaiting(); // Forces activation immediately
});

// Log activation event
// eslint-disable-next-line @typescript-eslint/no-unused-vars
self.addEventListener('activate', event => {
  console.log('Service Worker activated!');
  self.clients.claim(); // Takes control of uncontrolled pages
});

// Log fetch requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean); // Split and remove empty segments

  const pluginsIndex = pathSegments.indexOf('plugin-data');
  const slugIndex = pluginsIndex + 1;
  if (pluginsIndex !== -1 && pathSegments[slugIndex]) {
    const slug = pathSegments[slugIndex];
    const fileName =
      pathSegments.length > slugIndex + 1
        ? pathSegments[slugIndex + 1].split('?')[0]
        : '';
    event.respondWith(handlePlugin(slug, fileName.replace('?import', '')));
  }
});

async function handlePlugin(slug, fileName) {
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
  return new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = messageEvent => {
      let responseData;
      try {
        responseData =
          typeof messageEvent.data === 'string'
            ? JSON.parse(messageEvent.data)
            : messageEvent.data;
      } catch (error) {
        console.error('Failed to parse messageEvent data:', error);
        resolve(new Response('Invalid response format', { status: 500 }));
        return;
      }

      if (responseData && Array.isArray(responseData)) {
        responseData.forEach(({ name, content }) => {
          fileList.set(`${slug}/${name}`, content);
        });
      }

      const fileToCheck = fileName.length > 0 ? fileName : 'mf-manifest.json';

      if (fileList.has(`${slug}/${fileToCheck}`)) {
        let content = fileList.get(`${slug}/${fileToCheck}`);
        if (fileToCheck === 'mf-manifest.json') {
          const manifest = JSON.parse(content);
          if (manifest.metaData.publicPath) {
            manifest.metaData.publicPath = `/plugin-data/${slug}/`;
          }
          content = JSON.stringify(manifest);
        }
        const contentType = getContentType(fileToCheck);
        resolve(
          new Response(content, { headers: { 'Content-Type': contentType } }),
        );
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

function getContentType(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
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
