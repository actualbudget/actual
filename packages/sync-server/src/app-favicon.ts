import { lookup as dnsLookup } from 'node:dns/promises';

import express from 'express';
import type { Response as ExpressResponse, Request } from 'express';
import ipaddr from 'ipaddr.js';
import { Agent, fetch as undiciFetch } from 'undici';
import type { RequestInit as UndiciRequestInit } from 'undici';

import { assertUrlAllowed, isBlockedIp } from './util/ssrf';
import { validateSession } from './util/validate-user';

const MAX_RAW_BYTES = 256 * 1024;
const MAX_REDIRECTS = 8;
const REQUEST_TIMEOUT_MS = 20000;
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
  source: 'direct' | 'image';
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

// Intercepts DNS resolution at connection time so the IP that passes the
// SSRF check is the exact IP used for the TCP connection. A pre-fetch check
// would be vulnerable to DNS rebinding (the hostname could resolve to a
// different IP between the check and the actual connect).
//
// Node.js 22 passes { all: true } to the lookup option, so the success
// callback must use the array form: callback(null, [{address, family}]).
const ssrfSafeLookup = (
  hostname: string,
  _options: unknown,
  callback: (
    err: Error | null,
    addresses: { address: string; family: number }[],
  ) => void,
): void => {
  if (ipaddr.isValid(hostname)) {
    if (isBlockedIp(hostname)) {
      callback(new FaviconError(`Blocked IP: ${hostname}`, 403), []);
      return;
    }
    const parsed = ipaddr.parse(hostname);
    callback(null, [
      { address: hostname, family: parsed.kind() === 'ipv6' ? 6 : 4 },
    ]);
    return;
  }

  dnsLookup(hostname, { all: true })
    .then(addresses => {
      if (!addresses.length) {
        callback(new FaviconError(`No DNS records for: ${hostname}`, 502), []);
        return;
      }
      const safe = addresses.find(
        a => ipaddr.isValid(a.address) && !isBlockedIp(a.address),
      );
      if (!safe) {
        callback(
          new FaviconError(`All resolved IPs for ${hostname} are blocked`, 403),
          [],
        );
        return;
      }
      callback(null, [{ address: safe.address, family: safe.family }]);
    })
    .catch(() =>
      callback(new FaviconError(`DNS lookup failed for: ${hostname}`, 502), []),
    );
};

const ssrfSafeAgent = new Agent({
  connect: { lookup: ssrfSafeLookup, timeout: REQUEST_TIMEOUT_MS },
});

async function assertUrlSafe(url: string): Promise<void> {
  try {
    await assertUrlAllowed(url);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === 'Invalid URL') throw new FaviconError(msg, 400);
    if (msg.startsWith('Blocked')) throw new FaviconError(msg, 403);
    throw new FaviconError(msg, 502);
  }
}

function assertProtocolSafe(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new FaviconError(`Invalid URL: ${url}`, 400);
  }
  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new FaviconError(`Blocked URL scheme: ${parsed.protocol}`, 403);
  }
}

async function fetchWithTimeout(
  url: string,
  options: UndiciRequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    // The hostname in `url` is validated by assertHostnameSafe() before this
    // function is reached, and ssrfSafeAgent re-validates the resolved IP at
    // TCP connection time via ssrfSafeLookup, preventing DNS rebinding.
    // codeql[js/ssrf]
    return (await undiciFetch(url, {
      ...options,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; ActualBudget/favicon-fetcher)',
        ...(options.headers as Record<string, string> | undefined),
      },
      signal: controller.signal,
      dispatcher: ssrfSafeAgent,
    })) as unknown as Response;
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new FaviconError(
        `Request to ${url} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
        504,
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function safeFetch(
  url: string,
  init?: UndiciRequestInit,
): Promise<Response> {
  let next = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertProtocolSafe(next);
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

type IconCandidate = { href: string; score: number };

const ICON_REL_REGEX = /rel\s*=\s*["']?([^"'>\s]+)["']?/i;
const HREF_REGEX = /href\s*=\s*["']([^"']+)["']/i;
const SIZES_ATTR_REGEX = /sizes\s*=\s*["']([^"']+)["']/i;
const LINK_TAG_REGEX = /<link\b[^>]*>/gi;
const MANIFEST_TAG_REGEX = /<link\b[^>]*rel\s*=\s*["']?manifest["']?[^>]*>/i;

const ICON_SIZE_TARGET = 192 * 192;

const ICON_REL_DEFAULT_AREA: Record<string, number> = {
  icon: ICON_SIZE_TARGET,
  'shortcut icon': ICON_SIZE_TARGET,
  shortcut: ICON_SIZE_TARGET,
  'apple-touch-icon': 180 * 180,
  'mask-icon': 0,
};

function parseIconSizeArea(sizes: string | null): number {
  if (!sizes) return 0;
  if (sizes.toLowerCase() === 'any') return ICON_SIZE_TARGET;
  let best = 0;
  for (const token of sizes.split(/\s+/)) {
    const m = token.match(/^(\d+)[xX](\d+)$/);
    if (m) {
      best = Math.max(
        best,
        Math.min(Number(m[1]) * Number(m[2]), ICON_SIZE_TARGET),
      );
    }
  }
  return best;
}

function iconCandidateScore(rel: string, sizes: string | null): number {
  const area = parseIconSizeArea(sizes);
  if (area > 0) return area;
  return ICON_REL_DEFAULT_AREA[rel] ?? 0;
}

function extractIconCandidatesFromHtml(
  html: string,
  base: URL,
): IconCandidate[] {
  const candidates: IconCandidate[] = [];
  for (const tag of html.match(LINK_TAG_REGEX) ?? []) {
    const relMatch = tag.match(ICON_REL_REGEX);
    const hrefMatch = tag.match(HREF_REGEX);
    if (!relMatch || !hrefMatch) continue;
    const rel = relMatch[1].toLowerCase();
    if (!(rel in ICON_REL_DEFAULT_AREA)) continue;
    try {
      const href = new URL(hrefMatch[1], base).toString();
      const sizesMatch = tag.match(SIZES_ATTR_REGEX);
      const score = iconCandidateScore(rel, sizesMatch?.[1] ?? null);
      candidates.push({ href, score });
    } catch {
      // invalid href, skip
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

async function fetchManifestIconCandidates(
  html: string,
  base: URL,
): Promise<IconCandidate[]> {
  const manifestTagMatch = html.match(MANIFEST_TAG_REGEX);
  if (!manifestTagMatch) return [];
  const hrefMatch = manifestTagMatch[0].match(HREF_REGEX);
  if (!hrefMatch) return [];
  let manifestUrl: string;
  try {
    manifestUrl = new URL(hrefMatch[1], base).toString();
  } catch {
    return [];
  }
  try {
    const res = await safeFetch(manifestUrl);
    if (!res.ok) return [];
    const json = (await res.json()) as {
      icons?: Array<{ src?: string; sizes?: string }>;
    };
    if (!Array.isArray(json.icons)) return [];
    const candidates: IconCandidate[] = [];
    for (const icon of json.icons) {
      if (!icon.src) continue;
      try {
        const href = new URL(icon.src, base).toString();
        const area = parseIconSizeArea(icon.sizes ?? null);
        candidates.push({ href, score: area > 0 ? area : 192 * 192 });
      } catch {
        // skip invalid src
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  } catch (err) {
    rethrowIfClientPolicyError(err);
    return [];
  }
}

async function tryDirect(origin: URL): Promise<FaviconResult | null> {
  let html: string | null = null;
  let htmlCandidates: IconCandidate[] = [];

  try {
    const res = await safeFetch(origin.toString(), {
      headers: { accept: 'text/html,*/*;q=0.5' },
    });
    if (res.ok) {
      const ct = (res.headers.get('content-type') ?? '').toLowerCase();
      if (ct.includes('text/html')) {
        html = await res.text();
        htmlCandidates = extractIconCandidatesFromHtml(html, origin);
      }
    }
  } catch (err) {
    rethrowIfClientPolicyError(err);
    console.warn(
      '[favicon] homepage parse failed:',
      (err as Error).message,
      (err as { cause?: unknown }).cause ?? '',
    );
  }

  const manifestCandidates: IconCandidate[] =
    html !== null ? await fetchManifestIconCandidates(html, origin) : [];

  // Merge, deduplicate by href, keep highest score per URL.
  const seen = new Map<string, number>();
  for (const c of [...htmlCandidates, ...manifestCandidates]) {
    const prev = seen.get(c.href);
    if (prev === undefined || c.score > prev) seen.set(c.href, c.score);
  }
  const merged: IconCandidate[] = Array.from(seen.entries())
    .map(([href, score]) => ({ href, score }))
    .sort((a, b) => b.score - a.score);

  for (const candidate of merged.slice(0, 5)) {
    try {
      const dl = await downloadAsBase64(candidate.href);
      return { ...dl, source: 'direct' };
    } catch (err) {
      rethrowIfClientPolicyError(err);
      console.warn(
        '[favicon] candidate failed:',
        candidate.href,
        (err as Error).message,
        (err as { cause?: unknown }).cause ?? '',
      );
    }
  }

  // Well-known fallback paths not already tried.
  const triedHrefs = new Set(merged.slice(0, 5).map(c => c.href));
  const fallbackPaths = [
    new URL('/apple-touch-icon.png', origin).toString(),
    new URL('/apple-touch-icon-precomposed.png', origin).toString(),
    new URL('/favicon.ico', origin).toString(),
  ];
  for (const url of fallbackPaths) {
    if (triedHrefs.has(url)) continue;
    try {
      const dl = await downloadAsBase64(url);
      return { ...dl, source: 'direct' };
    } catch (err) {
      rethrowIfClientPolicyError(err);
      console.warn(
        '[favicon] fallback failed:',
        url,
        (err as Error).message,
        (err as { cause?: unknown }).cause ?? '',
      );
    }
  }

  return null;
}

/**
 * Fetch a favicon for a given website URL.
 *
 * Tries to parse `<link rel="icon">` from the homepage, then falls back to
 * `/favicon.ico`. Throws a FaviconError if neither succeeds.
 */
export async function fetchFaviconForUrl(
  websiteUrl: string,
): Promise<FaviconResult> {
  const url = normalizeUrl(websiteUrl);
  const origin = new URL(url.origin);

  await assertUrlSafe(origin.toString());

  const direct = await tryDirect(origin);
  if (direct) return direct;

  throw new FaviconError(`No favicon found for ${origin.hostname}`, 502);
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
  await assertUrlSafe(url.toString());
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
