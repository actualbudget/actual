import assert from 'node:assert/strict';

import { test } from 'vitest';

import { isInternalUrl } from '../trusted-url';

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
