#!/usr/bin/env node
// Minimal static file server for the prebuilt browser bundle at
// packages/desktop-client/build. Serves with the COOP/COEP headers required
// by the app (SharedArrayBuffer/SQLite). Intended for CI e2e runs where
// starting the full Vite dev server is unnecessary overhead.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'build');
const INDEX_PATH = path.join(ROOT, 'index.html');
const PORT = Number(process.env.PORT) || 3001;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
};

function setSharedHeaders(res) {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
}

function resolveFile(urlPath) {
  let cleanPath;
  try {
    cleanPath = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  } catch {
    return null;
  }
  if (cleanPath.includes('\0')) return null;
  // Strip leading slashes so path.resolve treats it as relative to ROOT,
  // regardless of whether the URL was absolute or contained duplicate
  // separators.
  const relPath = cleanPath.replace(/^\/+/, '');
  const candidate = path.resolve(ROOT, relPath);
  const relative = path.relative(ROOT, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  try {
    return fs.statSync(candidate).isFile() ? candidate : null;
  } catch {
    return null;
  }
}

const server = http.createServer((req, res) => {
  setSharedHeaders(res);

  const rawUrlPath = (req.url || '/').split('?')[0].split('#')[0];
  let filePath = resolveFile(req.url || '/');
  // SPA fallback: serve index.html only for routes without a file extension
  // (i.e. client-side routes). Asset requests that miss get a real 404 so the
  // browser doesn't receive HTML when it asked for JS/CSS/etc.
  if (!filePath) {
    const hasExtension = path.extname(rawUrlPath) !== '';
    if (hasExtension) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    filePath = INDEX_PATH;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  fs.createReadStream(filePath)
    .on('error', err => {
      res.writeHead(500);
      res.end(String(err));
    })
    .pipe(res);
});

server.listen(PORT, () => {
  console.log(`serve-build: serving ${ROOT} on http://localhost:${PORT}`);
});
