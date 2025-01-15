// @ts-strict-ignore
import * as Platform from 'loot-core/src/client/platform';

function parseSemanticVersion(versionString): [number, number, number] {
  return versionString
    .replace('v', '')
    .split('.')
    .map(n => parseInt(n));
}

function cmpSemanticVersion(
  versionStringA: string,
  versionStringB: string,
): number {
  const x = parseSemanticVersion(versionStringA);
  const y = parseSemanticVersion(versionStringB);

  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

export async function getLatestVersion(): Promise<string | 'unknown'> {
  if (Platform.isPlaywright) {
    return Promise.resolve('v99.9.9');
  }

  try {
    const response = await fetch(
      'https://api.github.com/repos/actualbudget/actual/tags',
    );
    const json = await response.json();
    const tags = json
      .map(t => t.name)
      .concat([`v${window.Actual.ACTUAL_VERSION}`]);
    tags.sort(cmpSemanticVersion);

    return tags[tags.length - 1];
  } catch {
    // Rate limit exceeded? Or perhaps Github is down?
    return 'unknown';
  }
}

export async function getIsOutdated(latestVersion: string): Promise<boolean> {
  const clientVersion = window.Actual.ACTUAL_VERSION;
  if (latestVersion === 'unknown') {
    return Promise.resolve(false);
  }
  return cmpSemanticVersion(clientVersion, latestVersion) < 0;
}
