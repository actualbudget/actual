import { fetch } from '#platform/server/fetch';
import { logger } from '#platform/server/log';

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

export type FaviconDirectResult = {
  contentType: string;
  base64: string;
  source: 'direct' | 'image';
};

class FaviconDirectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FaviconDirectError';
  }
}

function normalizeUrl(input: string): URL {
  let candidate = input.trim();
  if (!candidate) throw new FaviconDirectError('Empty URL');
  if (!/^https?:\/\//i.test(candidate)) candidate = 'https://' + candidate;
  try {
    return new URL(candidate);
  } catch {
    throw new FaviconDirectError(`Invalid URL: ${input}`);
  }
}

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  let next = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let res: Response;
    try {
      // codeql[js/ssrf] — desktop-only path; the local user controls the URL
      res = await fetch(next, {
        ...init,
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location');
      if (!location) {
        throw new FaviconDirectError(`Redirect without Location from ${next}`);
      }
      next = new URL(location, res.url || next).toString();
      continue;
    }
    return res;
  }
  throw new FaviconDirectError('Too many redirects');
}

function bufferToBase64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('base64');
}

async function readBodyCapped(
  res: Response,
  url: string,
): Promise<ArrayBuffer> {
  const cl = res.headers.get('content-length');
  if (cl) {
    const n = Number.parseInt(cl, 10);
    if (Number.isFinite(n) && n > MAX_RAW_BYTES) {
      throw new FaviconDirectError(
        `Favicon too large (${n} bytes) from ${url}`,
      );
    }
  }
  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0) {
    throw new FaviconDirectError(`Empty response from ${url}`);
  }
  if (buf.byteLength > MAX_RAW_BYTES) {
    throw new FaviconDirectError(
      `Favicon too large (${buf.byteLength} bytes) from ${url}`,
    );
  }
  return buf;
}

async function downloadAsBase64(
  url: string,
): Promise<{ contentType: string; base64: string }> {
  const res = await safeFetch(url);
  if (!res.ok) {
    throw new FaviconDirectError(`HTTP ${res.status} fetching ${url}`);
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
    throw new FaviconDirectError(
      `Unsupported content-type "${contentType}" from ${url}`,
    );
  }
  const buf = await readBodyCapped(res, url);
  return {
    contentType:
      contentType === 'application/octet-stream' ? 'image/x-icon' : contentType,
    base64: bufferToBase64(buf),
  };
}

const ICON_REL_REGEX = /rel\s*=\s*["']?([^"'>\s]+)["']?/i;
const HREF_REGEX = /href\s*=\s*["']([^"']+)["']/i;
const LINK_TAG_REGEX = /<link\b[^>]*>/gi;

function extractIconHref(html: string): string | null {
  const candidates: { rel: string; href: string }[] = [];
  for (const tag of html.match(LINK_TAG_REGEX) ?? []) {
    const relMatch = tag.match(ICON_REL_REGEX);
    const hrefMatch = tag.match(HREF_REGEX);
    if (!relMatch || !hrefMatch) continue;
    const rel = relMatch[1].toLowerCase();
    if (
      [
        'icon',
        'shortcut',
        'shortcut icon',
        'apple-touch-icon',
        'mask-icon',
      ].includes(rel)
    ) {
      candidates.push({ rel, href: hrefMatch[1] });
    }
  }
  candidates.sort((a, b) => {
    const score = (r: string) =>
      r === 'icon' || r === 'shortcut icon' || r === 'shortcut'
        ? 0
        : r === 'apple-touch-icon'
          ? 1
          : 2;
    return score(a.rel) - score(b.rel);
  });
  return candidates[0]?.href ?? null;
}

async function tryDirect(origin: URL): Promise<FaviconDirectResult | null> {
  try {
    const res = await safeFetch(origin.toString(), {
      headers: { accept: 'text/html,*/*;q=0.5' },
    });
    if (res.ok) {
      const ct = (res.headers.get('content-type') ?? '').toLowerCase();
      if (ct.includes('text/html')) {
        const href = extractIconHref(await res.text());
        if (href) {
          const dl = await downloadAsBase64(new URL(href, origin).toString());
          return { ...dl, source: 'direct' };
        }
      }
    }
  } catch (err) {
    logger.warn(
      '[favicon-direct] homepage parse failed:',
      (err as Error).message,
    );
  }
  try {
    const dl = await downloadAsBase64(
      new URL('/favicon.ico', origin).toString(),
    );
    return { ...dl, source: 'direct' };
  } catch (err) {
    logger.warn(
      '[favicon-direct] /favicon.ico fallback failed:',
      (err as Error).message,
    );
  }
  return null;
}

export async function fetchFaviconDirect(
  websiteUrl: string,
): Promise<FaviconDirectResult> {
  const url = normalizeUrl(websiteUrl);
  const origin = new URL(url.origin);
  const direct = await tryDirect(origin);
  if (direct) return direct;
  throw new FaviconDirectError(`No favicon found for ${origin.hostname}`);
}

export async function fetchImageDirect(
  imageUrl: string,
): Promise<FaviconDirectResult> {
  const url = normalizeUrl(imageUrl);
  const dl = await downloadAsBase64(url.toString());
  return { ...dl, source: 'image' };
}
