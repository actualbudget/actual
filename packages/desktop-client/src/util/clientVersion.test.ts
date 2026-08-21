import { describe, expect, it } from 'vitest';

import { getClientVersion } from './clientVersion';

const defaultOptions = {
  packageVersion: '26.7.0',
  isPlaywright: false,
};

describe('getClientVersion', () => {
  it('uses the test version for Playwright', () => {
    expect(getClientVersion({ ...defaultOptions, isPlaywright: true })).toBe(
      '99.9.9',
    );
  });

  it('uses the preview version for pull request deploys', () => {
    expect(getClientVersion({ ...defaultOptions, reviewId: '2939' })).toBe(
      '.preview',
    );
  });

  it('adds the short commit hash as SemVer build metadata', () => {
    expect(
      getClientVersion({
        ...defaultOptions,
        commitRef: 'e18c8adddee6dc699ff8a8a8c65aa93e97b3a81d',
      }),
    ).toBe('26.7.0+e18c8ad');
  });

  it('keeps the preview version when commit metadata is also provided', () => {
    expect(
      getClientVersion({
        ...defaultOptions,
        reviewId: '2939',
        commitRef: 'e18c8adddee6dc699ff8a8a8c65aa93e97b3a81d',
      }),
    ).toBe('.preview');
  });

  it('keeps a nightly package identifier without commit metadata', () => {
    expect(
      getClientVersion({
        ...defaultOptions,
        packageVersion: '26.8.0-nightly.20260719',
      }),
    ).toBe('26.8.0-nightly.20260719');
  });

  it('uses the package version for release builds', () => {
    expect(getClientVersion(defaultOptions)).toBe('26.7.0');
  });
});
