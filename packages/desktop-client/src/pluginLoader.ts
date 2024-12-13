import React from 'react';
import { ActualPlugin } from '../../plugins-shared/src';
import * as jszip from 'jszip';

export var loadedPlugins: ActualPlugin[] = null;

export function setLoadedPlugins(plugins: ActualPlugin[]) {
  loadedPlugins = plugins;
}

export async function loadPlugins(): Promise<ActualPlugin[]> {
  return [
    await loadPluginFromRepo('https://github.com/actual-plugins/example'),
  ];
}

async function loadPluginScript(scriptBlob: Blob): Promise<ActualPlugin> {
  window.React = React;

  var script = await scriptBlob.text();
  let adjustedContent = script.replace('import * as React from "react";', 'const React = window.React;');
  adjustedContent = adjustedContent.replace('import React__default from "react";', 'const React__default = window.React;');
  const scriptBlobAdjusted = new Blob([adjustedContent], { type: "application/javascript" });
  const scriptURL = URL.createObjectURL(scriptBlobAdjusted);
  const pluginModule = await import(/* @vite-ignore */ scriptURL);

  if (pluginModule?.default) {
    const plugin: ActualPlugin = pluginModule.default;
    console.log(
      `Plugin "${plugin.name}" v${plugin.version} loaded successfully.`,
    );
    return plugin;
  }
  throw new Error('Plugin script does not export a default object.');
}

async function fetchLatestRelease(
  owner: string,
  repo: string,
): Promise<{ version: string; zipUrl: string }> {
  debugger;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  const response = await fetch(apiUrl);
  if (!response.ok)
    throw new Error(`Failed to fetch release metadata for ${repo}`);

  const releaseData = await response.json();
  const version = releaseData.tag_name;
  const zipUrl = releaseData.assets.filter(f => f.name.includes('.zip'))[0]
    ?.browser_download_url;

  return { version, zipUrl };
}

function parseGitHubRepoUrl(
  url: string,
): { owner: string; repo: string } | null {
  try {
    const parsedUrl = new URL(url);

    if (!parsedUrl.hostname.includes('github.com')) {
      throw new Error('Not a valid GitHub URL');
    }

    const pathParts = parsedUrl.pathname.split('/').filter(Boolean); // Remove empty parts

    if (pathParts.length >= 2) {
      const owner = pathParts[0];
      const repo = pathParts[1];
      return { owner, repo };
    }

    throw new Error('URL does not contain owner and repository name');
  } catch (error) {
    console.error(`Error parsing GitHub URL: ${url}`, error.message);
    return null;
  }
}

async function loadPluginFromRepo(repo: string): Promise<ActualPlugin | null> {
  try {
    const parsedRepo = parseGitHubRepoUrl(repo);
    if (parsedRepo == null) {
      throw new Error(`Invalid repo ${repo}`);
    }

    console.log(`Checking for updates for plugin ${repo}...`);

    const { version: latestVersion, zipUrl } = await fetchLatestRelease(
      parsedRepo.owner,
      parsedRepo.repo,
    );

    // // Check if the plugin is already cached
    // const cachedPlugin = await getPlugin(repo);

    // if (cachedPlugin && cachedPlugin.version === latestVersion) {
    //   console.log(`Using cached plugin "${repo}" v${latestVersion}`);
    //   return await loadPluginScript(cachedPlugin.script);
    // }

    console.log(`Downloading plugin "${repo}" v${latestVersion}...`);

    // Download the ZIP file
    //const response = await fetch(zipUrl);
    //const response = await fetch('http://localhost:3001/example.zip');
    const response = await fetch('http://localhost:3001/index.es.js');

    if (!response.ok)
      throw new Error(`Failed to download plugin ZIP for ${repo}`);

    /*const zipBlob = await response.blob();

    // Extract index.js
    const zip = await jszip.loadAsync(zipBlob);
    const indexJsPath = Object.keys(zip.files).find(file =>
      file.endsWith('index.cjs.js'),
    );
    if (!indexJsPath)
      throw new Error(`No index.js file found in the plugin ZIP.`);

    const indexJsBlob = await zip.files[indexJsPath].async('blob');*/
    const indexJsBlob = await response.blob();

    // Save to cache
    //await savePlugin(repo, latestVersion, indexJsBlob);
    console.log(`Plugin "${repo}" cached successfully.`);

    // Load the plugin dynamically
    return await loadPluginScript(indexJsBlob);
  } catch (error) {
    console.error(`Error loading plugin "${repo}":`, error);
    return null;
  }
}
