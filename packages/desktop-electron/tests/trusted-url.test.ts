import assert from 'node:assert/strict';

import { test } from 'vitest';

import { isInternalUrl, isPermissionAllowed } from '../trusted-url';

test('rejects misleading URLs in production and development', () => {
  for (const url of [
    'https://evil.example/?next=app://actual',
    'https://evil.example/?next=localhost:3001',
    'http://localhost.evil.example:3001',
    'http://localhost:3002',
    'https://localhost:3001',
    'app://evil',
    'app://actual.evil',
    'app://actual:3001',
    'app://user@actual',
    'file:///tmp/app.html',
    'invalid',
  ]) {
    assert.equal(isInternalUrl(url, false), false, url);
    assert.equal(isInternalUrl(url, true), false, url);
  }
});

test('accepts only the app origin and the exact development origin', () => {
  assert.equal(isInternalUrl('app://actual/budget?tab=one', false), true);
  assert.equal(isInternalUrl('http://localhost:3001/budget', false), false);
  assert.equal(isInternalUrl('http://localhost:3001/budget', true), true);
});

test('lets only the app pages write to the clipboard', () => {
  const permission = 'clipboard-sanitized-write';
  assert.equal(
    isPermissionAllowed(permission, 'app://actual/settings', false),
    true,
  );
  assert.equal(
    isPermissionAllowed(permission, 'http://localhost:3001/settings', true),
    true,
  );
  assert.equal(
    isPermissionAllowed(permission, 'http://localhost:3001/settings', false),
    false,
  );
  assert.equal(
    isPermissionAllowed(permission, 'https://evil.example/', false),
    false,
  );
  assert.equal(
    isPermissionAllowed('media', 'app://actual/settings', false),
    false,
  );
  assert.equal(
    isPermissionAllowed('notifications', 'app://actual/', true),
    false,
  );
  assert.equal(
    isPermissionAllowed('media', 'file:///tmp/loading.html', false),
    true,
  );
});
