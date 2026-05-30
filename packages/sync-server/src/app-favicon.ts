import { lookup as dnsLookup } from 'node:dns/promises';

import express from 'express';
import type { Response as ExpressResponse, Request } from 'express';
import ipaddr from 'ipaddr.js';

import { validateSession } from './util/validate-user';

const MAX_RAW_BYTES = 32 * 1024;
const MAX_REDIRECTS = 8;
const REQUEST_TIMEOUT_MS = 8000;
const ALLOWED_CONTENT_TYPES = [
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/svg+xml',
  'image/webp',
];

type FaviconResult = {
  contentType: string;
  base64: string;
  source: 'direct' | 'duckduckgo' | 'image';
};

class FaviconError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = 'FaviconError';
    this.status = status;
  }
}

function normalizeUrl(input: string): URL {
  let candidate = input.trim();
  if (!candidate) {
    throw new FaviconError('Empty URL', 400);
  }
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = 'https://' + candidate;
  }
  try {
    return new URL(candidate);
  } catch {
    throw new FaviconError(`Invalid URL: ${input}`, 400);
  }
}

function isBlockedIp(ipStr: string): boolean {
  return ipaddr.process(ipStr).range() !== 'unicast';
}

/**
 * Resolve hostnames and block private/loopback/link-local targets (SSRF).
 */
async function assertHostnameResolvesToAllowedIps(
  hostname: string,
): Promise<void> {
  if (ipaddr.isValid(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new FaviconError(`Blocked hostname: ${hostname}`, 403);
    }
    return;
  }

  let addresses: { address: string; family: number }[];
  try {
    addresses = await dnsLookup(hostname, { all: true });
  } catch {
    throw new FaviconError(`DNS lookup failed for: ${hostname}`, 502);
  }

  if (!addresses.length) {
    throw new FaviconError(`No DNS records for: ${hostname}`, 502);
  }

  for (const { address } of addresses) {
    if (!ipaddr.isValid(address)) {
      throw new FaviconError(
        `Invalid resolved IP for ${hostname}: ${address}`,
        502,
      );
    }
    if (isBlockedIp(address)) {
      throw new FaviconError(`Blocked IP for ${hostname}: ${address}`, 403);
    }
  }
}

async function assertUrlSafeForFetch(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new FaviconError(`Invalid URL: ${url}`, 400);
  }
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new FaviconError(`Blocked URL scheme: ${parsed.protocol}`, 403);
  }
  await assertHostnameResolvesToAllowedIps(parsed.hostname);
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  let next = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertUrlSafeForFetch(next);
    const res = await fetchWithTimeout(next, {
      ...init,
      redirect: 'manual',
    });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location');
      if (!location) {
        throw new FaviconError(`Redirect without Location from ${next}`, 502);
      }
      next = new URL(location, res.url || next).toString();
      continue;
    }
    return res;
  }
  throw new FaviconError('Too many redirects', 502);
}

function bufferToBase64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('base64');
}

function rethrowIfClientPolicyError(err: unknown): void {
  if (
    err instanceof FaviconError &&
    (err.status === 403 || err.status === 400)
  ) {
    throw err;
  }
}

async function readResponseBodyCapped(
  res: Response,
  url: string,
): Promise<ArrayBuffer> {
  const contentLengthHeader = res.headers.get('content-length');
  if (contentLengthHeader) {
    const parsed = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(parsed) && parsed > MAX_RAW_BYTES) {
      throw new FaviconError(`Favicon too large (${parsed} bytes) from ${url}`);
    }
  }

  if (!res.body) {
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) {
      throw new FaviconError(`Empty response from ${url}`);
    }
    if (buf.byteLength > MAX_RAW_BYTES) {
      throw new FaviconError(
        `Favicon too large (${buf.byteLength} bytes) from ${url}`,
      );
    }
    return buf;
  }

  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (!value?.byteLength) {
      continue;
    }
    total += value.byteLength;
    if (total > MAX_RAW_BYTES) {
      void reader.cancel();
      throw new FaviconError(
        `Favicon too large (>${MAX_RAW_BYTES} bytes) from ${url}`,
      );
    }
    parts.push(value);
  }

  if (total === 0) {
    throw new FaviconError(`Empty response from ${url}`);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.byteLength;
  }
  return merged.buffer.slice(
    merged.byteOffset,
    merged.byteOffset + merged.byteLength,
  );
}

async function downloadAsBase64(
  url: string,
): Promise<{ contentType: string; base64: string }> {
  const res = await safeFetch(url);
  if (!res.ok) {
    throw new FaviconError(`HTTP ${res.status} fetching ${url}`);
  }
  const contentType = (
    res.headers.get('content-type') ?? 'application/octet-stream'
  )
    .split(';')[0]
    .trim()
    .toLowerCase();

  if (
    contentType !== 'application/octet-stream' &&
    !ALLOWED_CONTENT_TYPES.includes(contentType)
  ) {
    throw new FaviconError(
      `Unsupported content-type "${contentType}" from ${url}`,
    );
  }

  const buf = await readResponseBodyCapped(res, url);
  return {
    contentType:
      contentType === 'application/octet-stream' ? 'image/x-icon' : contentType,
    base64: bufferToBase64(buf),
  };
}

const ICON_REL_REGEX = /rel\s*=\s*["']?([^"'>\s]+)["']?/i;
const HREF_REGEX = /href\s*=\s*["']([^"']+)["']/i;
const LINK_TAG_REGEX = /<link\b[^>]*>/gi;

function extractIconHrefFromHtml(html: string): string | null {
  const candidates: { rel: string; href: string }[] = [];
  const links = html.match(LINK_TAG_REGEX) ?? [];
  for (const tag of links) {
    const relMatch = tag.match(ICON_REL_REGEX);
    const hrefMatch = tag.match(HREF_REGEX);
    if (!relMatch || !hrefMatch) continue;
    const rel = relMatch[1].toLowerCase();
    if (
      rel === 'icon' ||
      rel === 'shortcut' ||
      rel === 'shortcut icon' ||
      rel === 'apple-touch-icon' ||
      rel === 'mask-icon'
    ) {
      candidates.push({ rel, href: hrefMatch[1] });
    }
  }
  candidates.sort((a, b) => {
    const score = (rel: string) =>
      rel === 'icon' || rel === 'shortcut icon' || rel === 'shortcut'
        ? 0
        : rel === 'apple-touch-icon'
          ? 1
          : 2;
    return score(a.rel) - score(b.rel);
  });
  return candidates[0]?.href ?? null;
}

async function tryDirect(origin: URL): Promise<FaviconResult | null> {
  try {
    const res = await safeFetch(origin.toString(), {
      headers: { accept: 'text/html,*/*;q=0.5' },
    });
    if (res.ok) {
      const ct = (res.headers.get('content-type') ?? '').toLowerCase();
      if (ct.includes('text/html')) {
        const html = await res.text();
        const href = extractIconHrefFromHtml(html);
        if (href) {
          const iconUrl = new URL(href, origin).toString();
          const dl = await downloadAsBase64(iconUrl);
          return { ...dl, source: 'direct' };
        }
      }
    }
  } catch (err) {
    rethrowIfClientPolicyError(err);
    console.warn('[favicon] homepage parse failed:', (err as Error).message);
  }

  try {
    const dl = await downloadAsBase64(
      new URL('/favicon.ico', origin).toString(),
    );
    return { ...dl, source: 'direct' };
  } catch (err) {
    rethrowIfClientPolicyError(err);
    console.warn(
      '[favicon] /favicon.ico fallback failed:',
      (err as Error).message,
    );
  }

  return null;
}

async function tryDuckDuckGo(host: string): Promise<FaviconResult> {
  const url = `https://icons.duckduckgo.com/ip3/${encodeURIComponent(
    host,
  )}.ico`;
  const dl = await downloadAsBase64(url);
  return { ...dl, source: 'duckduckgo' };
}

/**
 * Fetch a favicon for a given website URL.
 *
 * Tries to parse `<link rel="icon">` from the homepage, then falls back to
 * `/favicon.ico`, and finally falls back to DuckDuckGo's favicon service.
 */
export async function fetchFaviconForUrl(
  websiteUrl: string,
): Promise<FaviconResult> {
  const url = normalizeUrl(websiteUrl);
  const origin = new URL(url.origin);
  const host = origin.hostname;

  await assertHostnameResolvesToAllowedIps(host);

  const direct = await tryDirect(origin);
  if (direct) return direct;

  return tryDuckDuckGo(host);
}

/**
 * Download a specific image URL and return it base64-encoded. Used for
 * auto-import of curated institution logos (e.g. GoCardless's `logo` field
 * on the institution record), where we already know the exact URL of the
 * image and don't need to do favicon discovery on the bank's homepage.
 *
 * The same SSRF guards, size cap, and content-type allow-list as the
 * favicon discovery flow apply.
 */
export async function fetchImageForUrl(
  imageUrl: string,
): Promise<FaviconResult> {
  const url = normalizeUrl(imageUrl);
  const dl = await downloadAsBase64(url.toString());
  return { ...dl, source: 'image' };
}

const app = express();

app.get('/', async (req: Request, res: ExpressResponse) => {
  const session = await validateSession(req, res);
  if (!session) return;

  const imageTarget = req.query.image as string | undefined;
  const target = (req.query.url ?? req.query.domain) as string | undefined;

  if (
    (!target || typeof target !== 'string') &&
    (!imageTarget || typeof imageTarget !== 'string')
  ) {
    res.status(400).json({ error: 'Missing url, domain, or image parameter' });
    return;
  }

  try {
    const result = imageTarget
      ? await fetchImageForUrl(imageTarget)
      : await fetchFaviconForUrl(target!);
    res.set('Cache-Control', 'private, max-age=300');
    res.json(result);
  } catch (err) {
    if (err instanceof FaviconError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(502).json({
      error: 'Failed to fetch favicon',
      details: (err as Error).message,
    });
  }
});

export { app as handlers };
