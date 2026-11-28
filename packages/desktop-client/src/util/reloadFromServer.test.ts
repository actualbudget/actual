import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { isAppOrigin, RELOAD_FROM_SERVER_SEARCH } from './reloadFromServer';

// The service worker answers every page load from its cache, except URLs
// matching `navigateFallbackDenylist` (tested against pathname + search). The
// patterns are read from the Vite config, which cannot import app code.
function getServiceWorkerDenylist() {
  const config = readFileSync(
    path.resolve(import.meta.dirname, '../../vite.config.mts'),
    'utf8',
  );
  const list = config.match(/navigateFallbackDenylist: \[([\s\S]*?)\n\s*\],/);
  return [...(list?.[1] ?? '').matchAll(/^\s*\/(.+)\/,$/gm)].map(
    ([, source]) => new RegExp(source),
  );
}

function isServedFromCache(pathAndSearch: string) {
  return !getServiceWorkerDenylist().some(pattern =>
    pattern.test(pathAndSearch),
  );
}

describe('isAppOrigin', () => {
  const { protocol, hostname, origin } = window.location;

  it.each([
    [origin, true],
    [origin + '/', true],
    [origin + '/budget', true],
    [`${protocol}//${hostname.toUpperCase()}:${window.location.port}`, true],
    [origin.replace(/(:\d+)?$/, ':8443'), false],
    [origin + '.example.com', false],
    ['https://example.com', false],
    ['not a url', false],
    ['', false],
    [null, false],
  ])('%s -> %s', (url, expected) => {
    expect(isAppOrigin(url)).toBe(expected);
  });
});

// Regression test for https://github.com/actualbudget/actual/issues/7026
describe('reloadFromServer', () => {
  it('uses a URL the service worker does not answer from its cache', () => {
    expect(getServiceWorkerDenylist().length).toBeGreaterThan(0);
    expect(isServedFromCache('/' + RELOAD_FROM_SERVER_SEARCH)).toBe(false);
  });

  it('leaves normal page loads to the service worker cache', () => {
    expect(isServedFromCache('/')).toBe(true);
    expect(isServedFromCache('/budget')).toBe(true);
  });
});
