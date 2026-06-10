import { fetch } from '#platform/server/fetch';
import { logger } from '#platform/server/log';

const MAX_RAW_BYTES = 256 * 1024;
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
  } catch {
    return [];
  }
}

async function tryDirect(origin: URL): Promise<FaviconDirectResult | null> {
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
    logger.warn(
      '[favicon-direct] homepage parse failed:',
      (err as Error).message,
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
      logger.warn(
        '[favicon-direct] candidate failed:',
        candidate.href,
        (err as Error).message,
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
      logger.warn(
        '[favicon-direct] fallback failed:',
        url,
        (err as Error).message,
      );
    }
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
