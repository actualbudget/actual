import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, test } from 'vitest';

import {
  getLastFileDialogFolder,
  rememberFileDialogSelection,
} from '../file-dialog-folder';

let dataDir: string;
let importsDir: string;

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'actual-file-dialog-'));
  importsDir = join(dataDir, 'imports');
  mkdirSync(importsDir);
});

afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

test('has no folder before a file was ever picked', async () => {
  assert.equal(await getLastFileDialogFolder(dataDir), undefined);
});

test('remembers the folder of the picked file', async () => {
  await rememberFileDialogSelection(dataDir, [join(importsDir, 'june.csv')]);

  assert.equal(await getLastFileDialogFolder(dataDir), importsDir);
});

test('keeps the remembered folder when the dialog is cancelled', async () => {
  await rememberFileDialogSelection(dataDir, [join(importsDir, 'june.csv')]);
  await rememberFileDialogSelection(dataDir, undefined);
  await rememberFileDialogSelection(dataDir, []);

  assert.equal(await getLastFileDialogFolder(dataDir), importsDir);
});

test('forgets a folder that was deleted', async () => {
  await rememberFileDialogSelection(dataDir, [join(importsDir, 'june.csv')]);
  rmSync(importsDir, { recursive: true });

  assert.equal(await getLastFileDialogFolder(dataDir), undefined);
});

test('forgets a folder that was replaced by a file', async () => {
  await rememberFileDialogSelection(dataDir, [join(importsDir, 'june.csv')]);
  rmSync(importsDir, { recursive: true });
  writeFileSync(importsDir, '');

  assert.equal(await getLastFileDialogFolder(dataDir), undefined);
});

test('ignores a damaged or unexpected state file', async () => {
  const statePath = join(dataDir, 'file-dialog.json');
  for (const contents of [
    '{"lastFolder":',
    'null',
    '[]',
    '{"lastFolder":42}',
    '{"lastFolder":"relative/folder"}',
  ]) {
    writeFileSync(statePath, contents);
    assert.equal(await getLastFileDialogFolder(dataDir), undefined, contents);
  }
});
