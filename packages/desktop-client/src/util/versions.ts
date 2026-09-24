// @ts-strict-ignore
import * as Platform from '@actual-app/core/shared/platform';

function parseSemanticVersion(versionString): [number, number, number] {
  return versionString
    .replace('v', '')
    .split('.')
    .map(n => parseInt(n));
}

export function cmpSemanticVersion(
  versionStringA: string,
  versionStringB: string,
): number {
  const x = parseSemanticVersion(versionStringA);
  const y = parseSemanticVersion(versionStringB);

  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

/**
 * Computes the client version string shown in the app.
 *
 * Edge/nightly builds all carry the same package.json version between
 * releases, so there's no way to tell which commit is actually running.
 * When a commit ref is available (forwarded from Netlify's `COMMIT_REF` or
 * GitHub Actions' `GITHUB_SHA`), append its short form as semver build
 * metadata, e.g. `26.9.0+e18c8ad`.
 */
export function computeClientVersion({
  isPlaywright,
  reviewId,
  commitRef,
  packageVersion,
}: {
  isPlaywright: boolean;
  reviewId: string | undefined;
  commitRef: string | undefined;
  packageVersion: string;
}): string {
  if (isPlaywright) {
    return '99.9.9';
  }
  if (reviewId) {
    return '.preview';
  }
  if (commitRef) {
    return `${packageVersion}+${commitRef.slice(0, 7)}`;
  }
  return packageVersion;
}

export async function getLatestVersion(): Promise<string | 'unknown'> {
  if (Platform.isPlaywright || import.meta.env.REACT_APP_REVIEW_ID) {
    return Promise.resolve('v99.9.9');
  }

  try {
    const response = await fetch(
      'https://api.github.com/repos/actualbudget/actual/releases/latest',
    );
    const json = await response.json();
    return json?.tag_name ?? 'unknown';
  } catch {
    // Rate limit exceeded? Or perhaps GitHub is down?
    return 'unknown';
  }
}

export function getIsOutdated(latestVersion: string): boolean {
  const clientVersion = window.Actual.ACTUAL_VERSION;
  if (latestVersion === 'unknown') {
    return false;
  }
  return cmpSemanticVersion(clientVersion, latestVersion) < 0;
}
