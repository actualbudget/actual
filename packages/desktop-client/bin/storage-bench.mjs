#!/usr/bin/env node
// Compares the browser storage engines on the built web bundle: opfs
// (sqlite-wasm on the private file system) and memory-idb (sqlite-wasm in
// memory, saved to IndexedDB, the fallback for browsers without sync access
// handles).
//
// Build first, then run from the repository root:
//
//   yarn build:browser
//   node packages/desktop-client/bin/storage-bench.mjs [--budget export.zip]
//     [--runs 3] [--backends opfs,memory-idb] [--rows 100] [--port 3195]
//
// Each run uses a fresh browser profile. It imports the given Actual export
// (or creates the demo budget), reloads to measure a cold open, deletes
// `rows` transactions in one bulk action and prints the medians as a
// Markdown table. Playwright and its Chromium come from the e2e setup
// (`@playwright/test`).

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const STORAGE_BACKEND_KEY = 'actual:storage-backend';

const options = parseArguments(process.argv.slice(2));

const server = spawn('node', [path.join(__dirname, 'serve-build.mjs')], {
  cwd: REPO_ROOT,
  env: { ...process.env, PORT: String(options.port) },
  stdio: ['ignore', 'ignore', 'inherit'],
});
process.on('exit', () => server.kill());
await waitForServer(`http://localhost:${options.port}/`);

const browser = await chromium.launch();
const results = [];
try {
  for (const backend of options.backends) {
    for (let run = 1; run <= options.runs; run++) {
      const timings = await measure(browser, backend);
      results.push({ backend, run, ...timings });
      console.error(
        `${backend} run ${run}: ${Object.entries(timings)
          .map(([name, ms]) => `${name} ${ms} ms`)
          .join(', ')}`,
      );
    }
  }
} finally {
  await browser.close();
  server.kill();
}
printTable(results);

async function measure(browser, backend) {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  });
  await context.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [STORAGE_BACKEND_KEY, backend],
  );
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.dismiss());
  const timings = {};

  await page.goto(`http://localhost:${options.port}/`);
  let started = performance.now();
  if (options.budget) {
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import my budget' }).click();
    await page
      .getByRole('button', {
        name: 'Actual Import a file exported from Actual',
      })
      .click();
    await page.getByRole('button', { name: 'Select file...' }).click();
    await (await chooser).setFiles(options.budget);
  } else {
    await page
      .getByRole('button', { name: 'Try the demo', exact: true })
      .click();
  }
  await page.getByTestId('budget-table').waitFor({ timeout: 600_000 });
  timings[options.budget ? 'import' : 'create'] = elapsed(started);

  // The IndexedDB fallback persists on a debounce
  await page.waitForTimeout(2000);
  started = performance.now();
  await page.reload();
  await page.getByTestId('budget-table').waitFor({ timeout: 600_000 });
  timings.coldOpen = elapsed(started);

  await page.getByRole('link', { name: 'All accounts' }).click();
  const table = page.getByTestId('transaction-table');
  await table.waitFor({ timeout: 120_000 });
  const rows = table.getByTestId('row');
  await rows.first().waitFor({ timeout: 120_000 });
  const available = await rows.count();
  const count = Math.min(options.rows, available);
  for (let index = 0; index < count; index++) {
    await rows.nth(index).getByTestId('select').click();
  }
  await page.getByTestId('transactions-select-button').click();
  await page
    .getByTestId('transactions-select-tooltip')
    .getByRole('button', { name: 'Delete' })
    .click();
  const confirm = page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete', exact: true });
  await confirm.waitFor({ timeout: 10_000 });
  // The sidebar total is recalculated once the delete has been applied
  const total = page.getByRole('link', { name: /^All accounts/ });
  const totalBefore = await total.innerText();
  started = performance.now();
  await confirm.click();
  await waitUntil(
    async () => (await total.innerText()) !== totalBefore,
    120_000,
  );
  timings[`delete${count}`] = elapsed(started);

  await context.close();
  return timings;
}

function elapsed(started) {
  return Math.round(performance.now() - started);
}

async function waitUntil(predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (!(await predicate())) {
    if (Date.now() > deadline) {
      throw new Error('Timed out waiting for the delete to be applied');
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function printTable(rows) {
  const metrics = [...new Set(rows.flatMap(row => Object.keys(row)))].filter(
    key => key !== 'backend' && key !== 'run',
  );
  console.log(
    `| backend | ${metrics.map(metric => `${metric} (ms, median)`).join(' | ')} |`,
  );
  console.log(`| --- | ${metrics.map(() => '---:').join(' | ')} |`);
  for (const backend of options.backends) {
    const runs = rows.filter(row => row.backend === backend);
    const cells = metrics.map(metric =>
      median(runs.map(row => row[metric]).filter(value => value != null)),
    );
    console.log(`| ${backend} | ${cells.join(' | ')} |`);
  }
}

function parseArguments(args) {
  const parsed = {
    budget: null,
    runs: 3,
    backends: ['opfs', 'memory-idb'],
    rows: 100,
    port: 3195,
  };
  for (let index = 0; index < args.length; index++) {
    const value = () => args[++index];
    switch (args[index]) {
      case '--budget':
        parsed.budget = path.resolve(value());
        break;
      case '--runs':
        parsed.runs = Number(value());
        break;
      case '--backends':
        parsed.backends = value().split(',');
        break;
      case '--rows':
        parsed.rows = Number(value());
        break;
      case '--port':
        parsed.port = Number(value());
        break;
      default:
        throw new Error(`Unknown argument: ${args[index]}`);
    }
  }
  return parsed;
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Not up yet
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`The build server did not start at ${url}`);
}
