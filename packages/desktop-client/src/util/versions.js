function parseSemanticVersion(versionString) {
  return versionString
    .replace('v', '')
    .split('.')
    .map(n => parseInt(n));
}

export function cmpSemanticVersion(versionStringA, versionStringB) {
  let x = parseSemanticVersion(versionStringA);
  let y = parseSemanticVersion(versionStringB);

  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
}

export async function getLatestVersion() {
  let response = await fetch(
    'https://api.github.com/repos/actualbudget/actual/tags',
  );
  let json = await response.json();
  let tags = json.map(t => t.name).concat([`v${window.Actual.ACTUAL_VERSION}`]);
  tags.sort(cmpSemanticVersion);

  return tags[tags.length - 1];
}

export async function getIsOutdated(latestVersion) {
  let clientVersion = window.Actual.ACTUAL_VERSION;
  return cmpSemanticVersion(clientVersion, latestVersion) < 0;
}
