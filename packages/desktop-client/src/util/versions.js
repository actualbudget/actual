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

// let failureCount = 0;
export async function getLatestVersion() {
  // if (failureCount < 3) {
  //   let response = await fetch(
  //     'https://api.github.com/repos/actualbudget/actual/tags',
  //   );

  //   if (response.ok) {
  //     console.log(response);
  //     let json = await response.json();
  //     let tags = json
  //       .map(t => t.name)
  //       .concat([`v${window.Actual.ACTUAL_VERSION}`]);
  //     tags.sort(cmpSemanticVersion);

  //     return tags[tags.length - 1];
  //   } else {
  //     console.error(`fail ${failureCount}`);
  //     failureCount++;
  //   }
  // }

  return `v${window.Actual.ACTUAL_VERSION}`;
}

export async function getIsOutdated(latestVersion) {
  let clientVersion = window.Actual.ACTUAL_VERSION;
  return cmpSemanticVersion(clientVersion, latestVersion) < 0;
}
