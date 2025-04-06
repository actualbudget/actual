// githubUtils.ts
import { type ActualPluginManifest } from '../../../../plugins-core/src';
import semverGt from 'semver/functions/gt'

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

type WhiteListPlugin = {
  url: string;
  version: string;
  manifest?: ActualPluginManifest;
  error?: string;
  loading: boolean;
};

export async function loadWhiteListPlugins(): Promise<WhiteListPlugin[]> {
  const response = await fetchWithHeader(
    'http://localhost:5006/cors-proxy?url=https://raw.githubusercontent.com/actual-plugins/whitelist/refs/heads/main/plugins.json',
  );

  if (!response.ok) {
    throw new Error('Failed to fetch whitelist plugins');
  }

  const plugins = (await response.json()) as WhiteListPlugin[];

  return await Promise.all(
    plugins.map(async plugin => {
      plugin.loading = true;
      const parsedRepo = parseGitHubRepoUrl(plugin.url);
      if (parsedRepo == null) {
        plugin.error = `Invalid repo ${plugin.url}`;
        plugin.loading = false;
        return plugin;
      }

      try {
        const { manifestUrl } = await fetchRelease(
          parsedRepo.owner,
          parsedRepo.repo,
          `tags/${plugin.version}`,
        );
        const manifestResponse = await fetch(
          `http://localhost:5006/cors-proxy?url=${manifestUrl}`,
        );
        if (manifestResponse.ok) {
          plugin.manifest = await manifestResponse.json();
        } else {
          plugin.error = 'Failed to fetch manifest';
        }
      } catch (error) {
        if (error && typeof error === 'object') {
          plugin.error = error.toString();
        } else {
          plugin.error = 'unknown error';
        }
      } finally {
        plugin.loading = false;
      }

      return plugin;
    }),
  );
}


export async function checkForNewPluginRelease(
  pluginUrl: string,
  currentVersion: string,
): Promise<{ hasNewVersion: boolean; latestVersion: string | null }> {
  const parsedRepo = parseGitHubRepoUrl(pluginUrl);
  if (!parsedRepo) {
    throw new Error(`Invalid GitHub URL: ${pluginUrl}`);
  }

  const { owner, repo } = parsedRepo;

  const response = await fetchWithHeader(
    `http://localhost:5006/cors-proxy?url=https://api.github.com/repos/${owner}/${repo}/releases/latest`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch latest release for ${repo}`);
  }

  const latestRelease = await response.json();
  const latestVersion = latestRelease.tag_name;

  const hasNewVersion = semverGt(latestVersion, currentVersion);
  return { hasNewVersion, latestVersion };
}
