type GitHubAsset = {
  name: string;
  browser_download_url: string;
};

export async function fetchWithHeader(url: string): Promise<Response> {
  return await fetch(url, {
    headers: {
      'x-requested-with': 'actual-budget',
    },
  });
}

export async function fetchRelease(
  owner: string,
  repo: string,
  releasePath: string,
): Promise<{ version: string; scriptUrl: string; manifestUrl: string }> {
  const apiUrl = `http://localhost:5006/cors-proxy?url=https://api.github.com/repos/${owner}/${repo}/releases/${releasePath}`;
  const response = await fetchWithHeader(apiUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch release metadata for ${repo}`);
  }

  const releaseData = await response.json();
  const version = releaseData.tag_name;
  const scriptAsset = (releaseData.assets as GitHubAsset[]).find(a =>
    a.name.endsWith('.zip'),
  );
  const scriptUrl = scriptAsset ? scriptAsset.browser_download_url : '';

  const manifestAsset = (releaseData.assets as GitHubAsset[]).find(
    a => a.name === 'manifest.json',
  );
  const manifestUrl = manifestAsset ? manifestAsset.browser_download_url : '';

  return { version, scriptUrl, manifestUrl };
}

export function parseGitHubRepoUrl(
  url: string,
): { owner: string; repo: string } | null {
  try {
    const parsedUrl = new URL(url);

    if (!parsedUrl.hostname.includes('github.com')) {
      throw new Error('Not a valid GitHub URL');
    }

    const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      const owner = pathParts[0];
      const repo = pathParts[1];
      return { owner, repo };
    }
    throw new Error('URL does not contain owner and repository name');
  } catch (error) {
    console.error(`Error parsing GitHub URL: ${url}`, error);
    return null;
  }
}
