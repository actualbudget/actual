// githubUtils.ts
import { type ActualPluginManifest } from '@actual-app/plugins-core';
import semverGt from 'semver/functions/gt';

import { send } from 'loot-core/platform/client/fetch';

type GitHubAsset = {
  name: string;
  browser_download_url: string;
};

// Internal function to make CORS proxy requests through loot-core
async function corsProxyFetch(url: string, options: { method?: string } = {}) {
  const result = await send('cors-proxy', {
    url,
    method: options.method || 'GET',
  });

  if (typeof result === 'object' && 'error' in result && result.error) {
    throw new Error(result.error);
  }

  return result;
}

export async function fetchWithHeader(url: string) {
  return await corsProxyFetch(url);
}

export async function fetchRelease(
  owner: string,
  repo: string,
  releasePath: string,
): Promise<{ version: string; scriptUrl: string; manifestUrl: string }> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/${releasePath}`;
  const result = await fetchWithHeader(apiUrl);

  // Handle error responses
  if (typeof result === 'object' && 'error' in result) {
    throw new Error(
      `Failed to fetch release metadata for ${repo}: ${result.error}`,
    );
  }

  // Handle binary responses (shouldn't happen for JSON API)
  if (typeof result === 'object' && 'isBinary' in result && result.isBinary) {
    throw new Error(`Unexpected binary response for ${repo}`);
  }

  const releaseData = typeof result === 'string' ? JSON.parse(result) : result;
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

type AllowListPlugin = {
  url: string;
  version: string;
  manifest?: ActualPluginManifest;
  error?: string;
  loading: boolean;
};

export async function loadAllowListPlugins(): Promise<AllowListPlugin[]> {
  const result = await fetchWithHeader(
    'https://raw.githubusercontent.com/actualbudget/plugin-store/refs/heads/main/plugins.json',
  );

  // Handle error responses
  if (typeof result === 'object' && 'error' in result) {
    throw new Error(`Failed to fetch whitelist plugins: ${result.error}`);
  }

  // Handle binary responses (shouldn't happen for JSON)
  if (typeof result === 'object' && 'isBinary' in result && result.isBinary) {
    throw new Error('Unexpected binary response for whitelist');
  }

  const plugins = (
    typeof result === 'string' ? JSON.parse(result) : result
  ) as AllowListPlugin[];

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
        const manifestResult = await fetchWithHeader(manifestUrl);

        if (typeof manifestResult === 'object' && 'error' in manifestResult) {
          plugin.error = `Failed to fetch manifest: ${manifestResult.error}`;
        } else if (
          typeof manifestResult === 'object' &&
          'isBinary' in manifestResult &&
          manifestResult.isBinary
        ) {
          plugin.error = 'Unexpected binary response for manifest';
        } else {
          plugin.manifest =
            typeof manifestResult === 'string'
              ? JSON.parse(manifestResult)
              : manifestResult;
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

  const result = await fetchWithHeader(
    `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
  );

  // Handle error responses
  if (typeof result === 'object' && 'error' in result) {
    throw new Error(
      `Failed to fetch latest release for ${repo}: ${result.error}`,
    );
  }

  // Handle binary responses (shouldn't happen for JSON API)
  if (typeof result === 'object' && 'isBinary' in result && result.isBinary) {
    throw new Error(`Unexpected binary response for ${repo}`);
  }

  const latestRelease =
    typeof result === 'string' ? JSON.parse(result) : result;
  const latestVersion = latestRelease.tag_name;

  const hasNewVersion = semverGt(latestVersion, currentVersion);
  return { hasNewVersion, latestVersion };
}
