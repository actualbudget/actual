import assert from 'node:assert/strict';
import { resolve, win32 } from 'node:path';

import { test } from 'vitest';

import { openExternalUrl, revealLocalFile } from '../external-links';

test('does not invoke OS handlers for unsupported links', async () => {
  for (const url of [
    'custom://handler',
    'file:///etc/passwd',
    ['javascript', 'alert(1)'].join(':'),
    'data:text/html,hello',
    'mailto:user@example.com',
    'ms-msdt:/id',
    'not a URL',
    null,
  ]) {
    assert.equal(
      await openExternalUrl(url, async () =>
        assert.fail('OS handler must not be invoked'),
      ),
      false,
    );
  }
});

test('opens parsed HTTP and HTTPS URLs, including mixed-case schemes', async () => {
  const opened: string[] = [];
  for (const url of [
    'https://example.com/path?q=one',
    'HTTP://example.com/path',
    'hTtPs://example.com',
  ]) {
    assert.equal(
      await openExternalUrl(url, async value => {
        opened.push(value);
      }),
      true,
    );
  }
  assert.deepEqual(opened, [
    'https://example.com/path?q=one',
    'http://example.com/path',
    'https://example.com/',
  ]);
});

test('rejects network and UNC paths in the separate file-manager action', () => {
  for (const path of [
    '//server/share/file',
    '\\\\server\\share\\file',
    'file://server/share/file',
    'https://example.com/file',
    'relative/file',
    '/\\server/share/file',
    String.raw`\\?\UNC\server\share\file`,
  ]) {
    assert.equal(
      revealLocalFile(path, () =>
        assert.fail('File manager must not be invoked'),
      ),
      false,
    );
  }
});

test('preserves local file reveal for native absolute paths', () => {
  const path = resolve('local-budget', 'metadata.json');
  const revealed: string[] = [];
  assert.equal(
    revealLocalFile(path, value => revealed.push(value)),
    true,
  );
  assert.deepEqual(revealed, [path]);
});

test('uses Windows path semantics to reject network paths and reveal drive paths', () => {
  const revealed: string[] = [];
  for (const path of [
    String.raw`\\server\share\file`,
    '//server/share/file',
    String.raw`\\?\UNC\server\share\file`,
  ]) {
    assert.equal(
      revealLocalFile(path, value => revealed.push(value), win32.isAbsolute),
      false,
    );
  }
  const local = String.raw`C:\Users\me\receipt.pdf`;
  assert.equal(
    revealLocalFile(local, value => revealed.push(value), win32.isAbsolute),
    true,
  );
  assert.deepEqual(revealed, [local]);
});
