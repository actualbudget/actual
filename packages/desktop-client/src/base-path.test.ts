import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  escapeRegExp,
  getBasePath,
  stripBasePath,
  withBasePath,
} from './base-path';

describe('base path', () => {
  it('normalizes a configured subpath and prefixes browser URLs', () => {
    expect(getBasePath('/finances/')).toBe('/finances');
    expect(getBasePath('/')).toBe('');
    expect(withBasePath('/finances/', '/static/app.js')).toBe(
      '/finances/static/app.js',
    );
    expect(withBasePath('/', '/static/app.js')).toBe('/static/app.js');
  });

  it('rejects unsafe or ambiguous configured paths', () => {
    expect(() => getBasePath('../x')).toThrow(/ACTUAL_BASE_PATH/);
    expect(() => getBasePath('/finances?x=1')).toThrow(/ACTUAL_BASE_PATH/);
    expect(() => getBasePath('/finance#x')).toThrow(/ACTUAL_BASE_PATH/);
    expect(() => getBasePath('/finance path')).toThrow(/ACTUAL_BASE_PATH/);
  });

  it('escapes regex metacharacters in configured paths', () => {
    for (const [basePath, nearPath] of [
      ['/cash+flow', '/cashxflow'],
      ['/a.b', '/axb'],
    ]) {
      const matcher = new RegExp(`^${escapeRegExp(basePath)}account/.*$`);
      expect(matcher.test(`${basePath}account/settings`)).toBe(true);
      expect(matcher.test(`${nearPath}account/settings`)).toBe(false);
    }
  });

  it('strips only the configured prefix from browser paths', () => {
    expect(stripBasePath('/finances', '/finances/budget')).toBe('/budget');
    expect(stripBasePath('/finances', '/finance/budget')).toBe(
      '/finance/budget',
    );
  });

  it('sets loot-core PUBLIC_URL before browser staging in dev and build', () => {
    const viteConfig = readFileSync(resolve('vite.config.mts'), 'utf8');
    const publicUrlAssignment = viteConfig.indexOf(
      'process.env.PUBLIC_URL = normalizedBasePath',
    );
    const stagingBranch = viteConfig.indexOf("if (command === 'build')");

    expect(publicUrlAssignment).toBeGreaterThanOrEqual(0);
    expect(publicUrlAssignment).toBeLessThan(stagingBranch);
  });

  it('keeps generated document and manifest assets under the configured base path', () => {
    const html = readFileSync(resolve('index.html'), 'utf8');
    expect(html).toContain('href="%BASE_URL%favicon.ico"');
    expect(html).toContain('href="%BASE_URL%site.webmanifest"');

    const manifest = JSON.parse(
      readFileSync(resolve('public/site.webmanifest'), 'utf8'),
    ) as {
      icons: Array<{ src: string }>;
      shortcuts: Array<{ url: string; icons: Array<{ src: string }> }>;
      screenshots: Array<{ src: string }>;
    };
    const urls = [
      ...manifest.icons.map(icon => icon.src),
      ...manifest.shortcuts.flatMap(shortcut => [
        shortcut.url,
        ...shortcut.icons.map(icon => icon.src),
      ]),
      ...manifest.screenshots.map(screenshot => screenshot.src),
    ];
    expect(urls.every(url => !url.startsWith('/'))).toBe(true);
  });
});
