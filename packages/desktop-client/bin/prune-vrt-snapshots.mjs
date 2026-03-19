#!/usr/bin/env node
/**
 * Remove PNGs under e2e/*-snapshots that are not listed in the VRT manifest
 * (written during the last `yarn vrt` run). Safe to no-op when the manifest is empty.
 *
 * With --check: validate only (no deletes):
 *   - Every manifest path must exist on disk (paths are relative to packages/desktop-client).
 *   - With --strict: every PNG under e2e/*-snapshots must appear in the manifest (no extras).
 *     Use --strict with a combined manifest directory (e.g. merge-vrt), not a single shard.
 *
 * Usage:
 *   node prune-vrt-snapshots.mjs [--check] [--strict] [manifest-dir ...]
 *
 * Manifest dirs: if omitted, uses VRT_SNAPSHOT_MANIFEST_DIR or e2e/.vrt-manifest.
 * Any .txt file under manifest dir(s) is scanned for path lines (recursive).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.join(__dirname, '..');

const argv = process.argv.slice(2);
const check = argv.includes('--check');
const strict = argv.includes('--strict');
const positional = argv.filter((a) => !a.startsWith('-'));

const defaultManifestDir =
  process.env.VRT_SNAPSHOT_MANIFEST_DIR ??
  path.join(pkgRoot, 'e2e', '.vrt-manifest');

const manifestRoots =
  positional.length > 0
    ? positional.map((d) => path.resolve(process.cwd(), d))
    : [defaultManifestDir];

/** @param {string} dir */
function collectLinesFromTxtFiles(dir) {
  const lines = new Set();
  if (!fs.existsSync(dir)) return lines;

  function walk(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith('.txt')) {
        const text = fs.readFileSync(p, 'utf8');
        for (const line of text.split('\n')) {
          const t = line.trim();
          if (t) lines.add(t);
        }
      }
    }
  }
  walk(dir);
  return lines;
}

const expected = new Set();
for (const root of manifestRoots) {
  for (const line of collectLinesFromTxtFiles(root)) expected.add(line);
}

if (check) {
  if (expected.size === 0 && !strict) {
    console.log('No VRT manifest entries to validate.');
    process.exit(0);
  }

  const missing = [];
  for (const rel of expected) {
    const abs = path.join(pkgRoot, rel);
    if (!fs.existsSync(abs)) missing.push(rel);
  }

  if (missing.length > 0) {
    console.error(
      'VRT manifest lists paths that are not present on disk under packages/desktop-client:',
    );
    for (const m of missing) console.error(`  ${m}`);
    process.exit(1);
  }

  if (strict) {
    const e2eRoot = path.join(pkgRoot, 'e2e');
    const extra = [];

    function walkPng(dir) {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walkPng(p);
        else if (ent.name.endsWith('.png')) {
          const rel = path.relative(pkgRoot, p).split(path.sep).join('/');
          if (!expected.has(rel)) extra.push(rel);
        }
      }
    }

    if (fs.existsSync(e2eRoot)) {
      for (const ent of fs.readdirSync(e2eRoot, { withFileTypes: true })) {
        if (ent.isDirectory() && ent.name.endsWith('-snapshots')) {
          walkPng(path.join(e2eRoot, ent.name));
        }
      }
    }

    if (extra.length > 0) {
      console.error(
        'PNG snapshot files exist that are not listed in the VRT manifest (remove them or update tests):',
      );
      for (const e of extra.sort()) console.error(`  ${e}`);
      process.exit(1);
    }
  }

  const msg =
    strict && expected.size === 0
      ? 'VRT manifest check OK (strict: no PNGs under e2e/*-snapshots).'
      : `VRT manifest check OK (${expected.size} path(s) in manifest${
          strict ? '; no extra PNGs under e2e/*-snapshots' : ''
        }).`;
  console.log(msg);
  process.exit(0);
}

if (expected.size === 0) {
  console.log('No VRT snapshot manifest entries; skipping orphan prune.');
  process.exit(0);
}

const e2eRoot = path.join(pkgRoot, 'e2e');
let removed = 0;

function considerRemove(absPath) {
  const rel = path.relative(pkgRoot, absPath).split(path.sep).join('/');
  if (!expected.has(rel)) {
    fs.unlinkSync(absPath);
    console.log('Removed orphan snapshot:', rel);
    removed += 1;
  }
}

function walkPngUnderSnapshotDir(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkPngUnderSnapshotDir(p);
    else if (ent.name.endsWith('.png')) considerRemove(p);
  }
}

for (const ent of fs.readdirSync(e2eRoot, { withFileTypes: true })) {
  if (ent.isDirectory() && ent.name.endsWith('-snapshots')) {
    walkPngUnderSnapshotDir(path.join(e2eRoot, ent.name));
  }
}

console.log(
  `VRT orphan prune done (${removed} removed, ${expected.size} expected).`,
);
