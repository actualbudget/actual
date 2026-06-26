#!/usr/bin/env node
// Static server for the package root with the COOP/COEP headers required for
// SharedArrayBuffer (absurd-sql). Used by playwright.config.ts.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 4180;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
};

http
  .createServer((req, res) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    const file = path.resolve(ROOT, urlPath.replace(/^\/+/, ''));
    if (
      path.relative(ROOT, file).startsWith('..') ||
      !fs.statSync(file, { throwIfNoEntry: false })?.isFile()
    ) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.setHeader(
      'Content-Type',
      MIME[path.extname(file)] ?? 'application/octet-stream',
    );
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => {
    console.log(`Serving ${ROOT} at http://localhost:${PORT}`);
  });
