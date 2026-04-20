/**
 * Nightly validation for the custom theme catalog.
 *
 * Reads packages/desktop-client/src/data/customThemeCatalog.json, fetches the
 * `actual.css` for each entry from its GitHub repo, and runs the same
 * validation the app uses at install time. Exits 1 if any theme fails.
 *
 * Security posture: third-party CSS is treated as opaque text throughout.
 * It is never executed, never injected into a DOM, size-capped, time-capped,
 * and only fetched over HTTPS from a pinned host (raw.githubusercontent.com)
 * constructed from a schema-checked `owner/repo` string.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  embedThemeFonts,
  validateThemeCss,
} from '../src/style/customThemes.ts';

const MAX_CSS_BYTES = 512 * 1024; // 512 KB — hard cap on actual.css size.
const FETCH_TIMEOUT_MS = 15_000; // Per-request timeout.
const INTER_REQUEST_DELAY_MS = 250; // Gentle rate-limit to raw.githubusercontent.com.
const REPO_PATTERN = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

type CatalogEntry = {
  name: string;
  repo: string;
  mode: 'light' | 'dark';
  colors?: string[];
};

type ThemeResult = {
  name: string;
  repo: string;
  status: 'ok' | 'error';
  error?: string;
};

const here = dirname(fileURLToPath(import.meta.url));
const catalogPath = resolve(
  here,
  '..',
  'src',
  'data',
  'customThemeCatalog.json',
);

function readCatalog(): CatalogEntry[] {
  const raw = readFileSync(catalogPath, 'utf8');
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('Catalog JSON must be an array.');
  }

  return parsed.map((entry, i) => validateCatalogEntry(entry, i));
}

function validateCatalogEntry(value: unknown, index: number): CatalogEntry {
  if (!value || typeof value !== 'object') {
    throw new Error(`Catalog entry #${index} is not an object.`);
  }
  const e = value as Record<string, unknown>;

  if (typeof e.name !== 'string' || !e.name.trim()) {
    throw new Error(`Catalog entry #${index} is missing a valid "name".`);
  }
  if (typeof e.repo !== 'string' || !REPO_PATTERN.test(e.repo)) {
    throw new Error(
      `Catalog entry "${String(e.name)}" has an invalid "repo" (expected "owner/repo"): ${JSON.stringify(e.repo)}`,
    );
  }
  if (e.mode !== 'light' && e.mode !== 'dark') {
    throw new Error(
      `Catalog entry "${String(e.name)}" has an invalid "mode" (expected "light" or "dark").`,
    );
  }
  if (
    e.colors !== undefined &&
    (!Array.isArray(e.colors) ||
      !e.colors.every((c: unknown) => typeof c === 'string'))
  ) {
    throw new Error(
      `Catalog entry "${String(e.name)}" has an invalid "colors" (expected string[]).`,
    );
  }

  return {
    name: e.name,
    repo: e.repo,
    mode: e.mode,
    colors: e.colors as string[] | undefined,
  };
}

async function fetchWithLimits(url: string): Promise<string> {
  // Pin the URL shape defensively — even though callers construct it, re-check here.
  if (!url.startsWith('https://raw.githubusercontent.com/')) {
    throw new Error(`Refusing to fetch from non-pinned URL: ${url}`);
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: 'error',
    headers: { Accept: 'text/css, text/plain, */*' },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
    );
  }

  const contentLength = response.headers.get('content-length');
  if (contentLength !== null) {
    const size = Number.parseInt(contentLength, 10);
    if (Number.isFinite(size) && size > MAX_CSS_BYTES) {
      throw new Error(
        `CSS at ${url} is ${size} bytes; max allowed is ${MAX_CSS_BYTES} bytes.`,
      );
    }
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error(`Response from ${url} has no body.`);
  }

  const decoder = new TextDecoder('utf-8');
  let received = 0;
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_CSS_BYTES) {
      await reader.cancel();
      throw new Error(
        `CSS at ${url} exceeds max allowed size of ${MAX_CSS_BYTES} bytes.`,
      );
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

async function validateOne(entry: CatalogEntry): Promise<ThemeResult> {
  try {
    const url = `https://raw.githubusercontent.com/${entry.repo}/refs/heads/main/actual.css`;
    const css = await fetchWithLimits(url);
    // Match the install-time flow in ThemeInstaller: embed referenced fonts
    // into data: URIs first, then validate the result. Validating before
    // embedding rejects any theme that references fonts via relative url()
    // paths, because the validator only accepts data: URIs in @font-face.
    // Cap the font-embedding phase with the same per-fetch timeout as the
    // CSS fetch so a slow font host can't stall the job's 10-min budget.
    const embedded = await embedThemeFonts(
      css,
      entry.repo,
      AbortSignal.timeout(FETCH_TIMEOUT_MS),
    );
    validateThemeCss(embedded);
    return { name: entry.name, repo: entry.repo, status: 'ok' };
  } catch (err) {
    return {
      name: entry.name,
      repo: entry.repo,
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function escapeForMarkdown(s: string): string {
  // Escape backticks and HTML-ish characters so a crafted error message
  // cannot break out of the step summary or inject markup.
  return s.replace(/[`<>|]/g, c => `\\${c}`).replace(/\r?\n/g, ' ');
}

async function writeStepSummary(results: ThemeResult[]): Promise<void> {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;

  const okCount = results.filter(r => r.status === 'ok').length;
  const failCount = results.length - okCount;

  const lines: string[] = [];
  lines.push('# Custom theme catalog scan');
  lines.push('');
  lines.push(`- Total themes: ${results.length}`);
  lines.push(`- Passing: ${okCount}`);
  lines.push(`- Failing: ${failCount}`);
  lines.push('');
  lines.push('| Status | Theme | Repo | Error |');
  lines.push('| --- | --- | --- | --- |');
  for (const r of results) {
    const status = r.status === 'ok' ? 'pass' : 'FAIL';
    const err = r.error ? escapeForMarkdown(r.error) : '';
    lines.push(
      `| ${status} | ${escapeForMarkdown(r.name)} | ${escapeForMarkdown(r.repo)} | ${err} |`,
    );
  }
  lines.push('');

  const { appendFileSync } = await import('node:fs');
  appendFileSync(summaryPath, lines.join('\n') + '\n');
}

async function main(): Promise<void> {
  const catalog = readCatalog();
  console.log(`Validating ${catalog.length} theme(s) from the catalog…`);

  const results: ThemeResult[] = [];
  for (const entry of catalog) {
    const result = await validateOne(entry);
    if (result.status === 'ok') {
      console.log(`  ok    ${entry.repo.padEnd(55)} ${entry.name}`);
    } else {
      console.log(
        `  FAIL  ${entry.repo.padEnd(55)} ${entry.name}\n        → ${result.error}`,
      );
    }
    results.push(result);
    await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY_MS));
  }

  const failed = results.filter(r => r.status === 'error');
  console.log('');
  console.log(
    `Summary: ${results.length - failed.length}/${results.length} passing, ${failed.length} failing.`,
  );

  await writeStepSummary(results);

  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
