import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CatalogTheme } from '../src/style/customThemes.ts';
import {
  embedThemeFonts,
  validateThemeCss,
} from '../src/style/customThemes.ts';

const MAX_CSS_BYTES = 512 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const REPO_PATTERN = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

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

function readCatalog(): CatalogTheme[] {
  const raw = readFileSync(catalogPath, 'utf8');
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('Catalog JSON must be an array.');
  }

  return parsed.map((entry, i) => validateCatalogEntry(entry, i));
}

function validateCatalogEntry(value: unknown, index: number): CatalogTheme {
  if (!value || typeof value !== 'object') {
    throw new Error(`Catalog entry #${index} is not an object.`);
  }
  const e = value as Record<string, unknown>;

  if (typeof e.name !== 'string' || !e.name.trim()) {
    throw new Error(`Catalog entry #${index} is missing a valid "name".`);
  }
  // Schema-check the repo before it gets interpolated into a fetch URL.
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

async function fetchCss(url: string): Promise<string> {
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

async function validateOne(entry: CatalogTheme): Promise<ThemeResult> {
  try {
    const url = `https://raw.githubusercontent.com/${entry.repo}/refs/heads/main/actual.css`;
    const css = await fetchCss(url);
    // Embed fonts before validation: the validator only accepts data: URIs in
    // @font-face, and embedThemeFonts is what turns relative url() refs into
    // data: URIs. Matches ThemeInstaller's install flow.
    const embedded = await embedThemeFonts(css, entry.repo);
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
  return s.replace(/[`<>|]/g, c => `\\${c}`).replace(/\r?\n/g, ' ');
}

function writeStepSummary(results: ThemeResult[]): void {
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
  }

  const failed = results.filter(r => r.status === 'error');
  console.log('');
  console.log(
    `Summary: ${results.length - failed.length}/${results.length} passing, ${failed.length} failing.`,
  );

  writeStepSummary(results);

  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
