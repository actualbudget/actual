import { randomBytes } from 'node:crypto';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import lockfile from 'proper-lockfile';

export type Release = () => Promise<void>;

export type AcquireOptions = {
  timeoutMs: number;
};

const LOCKFILE_NAME = 'lock';
const READERS_DIR_NAME = 'readers';
const READER_POLL_INTERVAL_MS = 100;

function lockfilePath(dir: string): string {
  return join(dir, LOCKFILE_NAME);
}

function readersDir(dir: string): string {
  return join(dir, READERS_DIR_NAME);
}

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

function retriesForTimeout(timeoutMs: number) {
  return {
    retries: Math.max(1, Math.floor(timeoutMs / 200)),
    minTimeout: 100,
    maxTimeout: 500,
    factor: 1.5,
  };
}

function errorCode(err: unknown): string | undefined {
  if (err instanceof Error && 'code' in err) {
    const { code } = err as { code?: unknown };
    if (typeof code === 'string') return code;
  }
  return undefined;
}

function isLockedError(err: unknown): boolean {
  return errorCode(err) === 'ELOCKED';
}

function lockedMessage(timeoutMs: number): string {
  return `Another CLI process is holding the budget (waited ${Math.round(
    timeoutMs / 1000,
  )}s). Retry, or use a different --data-dir.`;
}

function pidIsAlive(pid: number): boolean {
  if (pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return errorCode(err) === 'EPERM';
  }
}

function readReaderNames(readers: string): string[] {
  try {
    return readdirSync(readers);
  } catch (err) {
    if (errorCode(err) === 'ENOENT') return [];
    throw err;
  }
}

function sweepStaleReaders(dir: string) {
  const readers = readersDir(dir);
  for (const name of readReaderNames(readers)) {
    const pid = Number(name.split('-')[0]);
    if (!Number.isFinite(pid) || !pidIsAlive(pid)) {
      rmSync(join(readers, name), { force: true });
    }
  }
}

async function waitForReadersEmpty(dir: string, timeoutMs: number) {
  const readers = readersDir(dir);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    sweepStaleReaders(dir);
    if (readReaderNames(readers).length === 0) return;
    await new Promise(resolve => setTimeout(resolve, READER_POLL_INTERVAL_MS));
  }
  throw new Error(lockedMessage(timeoutMs));
}

async function acquireGate(
  dir: string,
  timeoutMs: number,
): Promise<() => Promise<void>> {
  ensureDir(dir);
  try {
    return await lockfile.lock(dir, {
      lockfilePath: lockfilePath(dir),
      retries: retriesForTimeout(timeoutMs),
      stale: 30_000,
    });
  } catch (err) {
    if (isLockedError(err)) throw new Error(lockedMessage(timeoutMs));
    throw err;
  }
}

export async function acquireExclusive(
  dir: string,
  { timeoutMs }: AcquireOptions,
): Promise<Release> {
  const start = Date.now();
  const release = await acquireGate(dir, timeoutMs);
  try {
    const remaining = Math.max(0, timeoutMs - (Date.now() - start));
    await waitForReadersEmpty(dir, remaining);
  } catch (err) {
    await release();
    throw err;
  }
  return () => release();
}

export async function acquireShared(
  dir: string,
  { timeoutMs }: AcquireOptions,
): Promise<Release> {
  const gate = await acquireGate(dir, timeoutMs);
  let markerPath: string;
  try {
    const readers = readersDir(dir);
    ensureDir(readers);
    const markerName = `${process.pid}-${randomBytes(6).toString('hex')}`;
    markerPath = join(readers, markerName);
    writeFileSync(markerPath, '');
  } catch (err) {
    await gate();
    throw err;
  }
  await gate();
  return async () => {
    rmSync(markerPath, { force: true });
  };
}
