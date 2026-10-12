import assert from 'node:assert/strict';
import path from 'node:path';

import { test } from 'vitest';

import { dialogDefaultPath, directoryToRemember } from '../file-dialog-dir';

test('only offers a remembered folder that still exists', () => {
  assert.equal(dialogDefaultPath(undefined, () => true), undefined);
  assert.equal(dialogDefaultPath('', () => true), undefined);
  assert.equal(
    dialogDefaultPath(path.join('/budgets', 'imports'), () => true),
    path.join('/budgets', 'imports'),
  );
  // A renamed or deleted folder, or one on a drive that is no longer attached,
  // must not be handed to the dialog.
  assert.equal(
    dialogDefaultPath(path.join('/budgets', 'gone'), () => false),
    undefined,
  );
});

test('remembers the folder holding the chosen file', () => {
  assert.equal(directoryToRemember(undefined, ['openFile']), undefined);
  assert.equal(directoryToRemember([], ['openFile']), undefined);
  assert.equal(
    directoryToRemember(
      [path.join('/budgets', 'imports', 'june.csv')],
      ['openFile'],
    ),
    path.join('/budgets', 'imports'),
  );
});

test('remembers the folder itself when the dialog picks a folder', () => {
  assert.equal(
    directoryToRemember([path.join('/budgets', 'data')], ['openDirectory']),
    path.join('/budgets', 'data'),
  );
});
