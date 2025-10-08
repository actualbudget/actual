import { fork } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import AdmZip from 'adm-zip';
import createDebug from 'debug';

import { secretsService } from './services/secrets-service.js';

const debug = createDebug('actual:config');

class PluginManager {
  constructor(pluginsDir) {
    this.pluginsDir = pluginsDir;
    this.onlinePlugins = new Map();
    this.extractedPlugins = new Map(); // Track extracted zip plugins for cleanup
  }

  /**
   * Extract a zip file to a temporary directory
   */
  extractZipPlugin(zipPath, pluginSlug) {
    try {
      const zip = new AdmZip(zipPath);
      const extractPath = path.join(os.tmpdir(), 'actual-plugins', pluginSlug);

      // Clean up existing extraction if it exists
      if (fs.existsSync(extractPath)) {
        fs.rmSync(extractPath, { recursive: true, force: true });
      }

      // Extract the zip
      zip.extractAllTo(extractPath, true);

      // Track this for cleanup
      this.extractedPlugins.set(pluginSlug, extractPath);

      return extractPath;
    } catch (error) {
      throw new Error(
        `Failed to extract zip plugin ${pluginSlug}: ${error.message}`,
      );
    }
  }

  /**
   * Get plugin slug from manifest
   */
  getPluginSlugFromManifest(pluginPath) {
    const manifestPath = path.join(pluginPath, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        return manifest.name || null;
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  /**
   * Load all plugins from the plugins directory
   * Supports both subdirectories and .zip files
   * On slug clash, loads the first plugin and warns about duplicates
   */
  async loadPlugins() {
    if (!fs.existsSync(this.pluginsDir)) {
      console.log('Plugins directory does not exist:', this.pluginsDir);
      return;
    }

    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });
    const loadedSlugs = new Set();
    const pluginsToLoad = [];

    // First pass: collect all plugins and their slugs
    for (const entry of entries) {
      try {
        if (entry.isDirectory()) {
          const pluginPath = path.join(this.pluginsDir, entry.name);
          const pluginSlug =
            this.getPluginSlugFromManifest(pluginPath) || entry.name;
          pluginsToLoad.push({
            type: 'directory',
            name: entry.name,
            slug: pluginSlug,
            path: pluginPath,
          });
        } else if (entry.isFile() && entry.name.endsWith('.zip')) {
          const zipPath = path.join(this.pluginsDir, entry.name);
          const zipFilename = entry.name;

          // Try to extract to temp location to read manifest
          const tempSlug = zipFilename
            .replace(/\.zip$/, '')
            .replace(/\.\d+\.\d+\.\d+$/, ''); // Remove semver if present

          try {
            const extractedPath = this.extractZipPlugin(zipPath, tempSlug);
            const pluginSlug =
              this.getPluginSlugFromManifest(extractedPath) || tempSlug;

            pluginsToLoad.push({
              type: 'zip',
              name: entry.name,
              slug: pluginSlug,
              path: extractedPath,
              zipPath,
            });
          } catch (error) {
            console.error(
              `Failed to extract zip ${entry.name}:`,
              error.message,
            );
          }
        }
      } catch (error) {
        console.error(`Failed to process plugin ${entry.name}:`, error.message);
      }
    }

    // Second pass: load plugins, checking for slug clashes
    for (const plugin of pluginsToLoad) {
      try {
        if (loadedSlugs.has(plugin.slug)) {
          console.warn(
            `⚠️  Plugin slug clash detected: "${plugin.slug}" from "${plugin.name}" ` +
              `is already loaded. Skipping this plugin.`,
          );

          // Clean up extracted zip if it wasn't loaded
          if (plugin.type === 'zip' && this.extractedPlugins.has(plugin.slug)) {
            const extractPath = this.extractedPlugins.get(plugin.slug);
            if (fs.existsSync(extractPath)) {
              fs.rmSync(extractPath, { recursive: true, force: true });
            }
            this.extractedPlugins.delete(plugin.slug);
          }
          continue;
        }

        await this.loadPlugin(plugin.slug, plugin.path, plugin.type === 'zip');
        loadedSlugs.add(plugin.slug);
        console.log(`✅ Loaded plugin: ${plugin.slug} (from ${plugin.name})`);

        // Debug: Show plugin routes and permissions
        this.debugPluginRoutes(plugin.slug);
      } catch (error) {
        console.error(`Failed to load plugin ${plugin.name}:`, error.message);

        // Clean up extracted zip on failure
        if (plugin.type === 'zip' && this.extractedPlugins.has(plugin.slug)) {
          const extractPath = this.extractedPlugins.get(plugin.slug);
          if (fs.existsSync(extractPath)) {
            fs.rmSync(extractPath, { recursive: true, force: true });
          }
          this.extractedPlugins.delete(plugin.slug);
        }
      }
    }
  }

  /**
   * Load a single plugin by slug
   * @param {string} pluginSlug - The plugin identifier
   * @param {string} pluginPath - Path to the plugin directory
   * @param {boolean} _isExtracted - Whether this plugin was extracted from a zip
   */
  async loadPlugin(pluginSlug, pluginPath, _isExtracted = false) {
    const manifestPath = path.join(pluginPath, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Plugin ${pluginSlug} does not have a manifest.json`);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    if (!manifest.entry) {
      throw new Error(
        `Plugin ${pluginSlug} manifest does not specify an entry point`,
      );
    }

    const entryPath = path.join(pluginPath, manifest.entry);

    if (!fs.existsSync(entryPath)) {
      throw new Error(
        `Plugin ${pluginSlug} entry point does not exist: ${entryPath}`,
      );
    }

    // Fork the plugin as a child process
    const childProcess = fork(entryPath, {
      cwd: pluginPath,
      silent: false,
      env: {
        ...process.env,
        PLUGIN_SLUG: pluginSlug,
        PLUGIN_PATH: pluginPath,
      },
    });

    // Store plugin information
    this.onlinePlugins.set(pluginSlug, {
      slug: pluginSlug,
      manifest,
      process: childProcess,
      ready: false,
      pendingRequests: new Map(),
    });

    // Setup IPC message handler
    childProcess.on('message', message => {
      this.handlePluginMessage(pluginSlug, message);
    });

    childProcess.on('error', error => {
      console.error(`Plugin ${pluginSlug} error:`, error);
    });

    childProcess.on('exit', code => {
      console.log(`Plugin ${pluginSlug} exited with code ${code}`);
      this.onlinePlugins.delete(pluginSlug);
    });

    // Wait for plugin to be ready
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(`Plugin ${pluginSlug} did not respond within timeout`),
        );
      }, 10000);

      const readyHandler = message => {
        if (message.type === 'ready') {
          clearTimeout(timeout);
          const plugin = this.onlinePlugins.get(pluginSlug);
          if (plugin) {
            plugin.ready = true;
          }
          childProcess.removeListener('message', readyHandler);
          resolve();
        }
      };

      childProcess.on('message', readyHandler);
    });
  }

  /**
   * Handle messages from plugin processes
   */
  handlePluginMessage(pluginSlug, message) {
    const plugin = this.onlinePlugins.get(pluginSlug);
    if (!plugin) return;

    if (message.type === 'response') {
      const { requestId, status, headers, body } = message;
      const pendingRequest = plugin.pendingRequests.get(requestId);

      if (pendingRequest) {
        pendingRequest.resolve({ status, headers, body });
        plugin.pendingRequests.delete(requestId);
      }
    } else if (message.type === 'error') {
      const { requestId, error } = message;
      const pendingRequest = plugin.pendingRequests.get(requestId);

      if (pendingRequest) {
        pendingRequest.reject(new Error(error));
        plugin.pendingRequests.delete(requestId);
      }
    } else if (message.type === 'secret-set' || message.type === 'secret-get') {
      // Handle secret operations from plugin
      this.handleSecretOperation(pluginSlug, message);
    }
  }

  /**
   * Handle secret operations from plugins
   * Uses the sync-server's existing secrets service for proper persistence
   */
  async handleSecretOperation(pluginSlug, message) {
    const plugin = this.onlinePlugins.get(pluginSlug);
    if (!plugin) {
      return;
    }

    const { messageId, type, name, value } = message;

    try {
      if (type === 'secret-set') {
        // Use the secrets service for proper persistence
        secretsService.set(name, value);

        plugin.process.send({
          type: 'secret-response',
          messageId,
          data: { success: true },
        });
      } else if (type === 'secret-get') {
        // Get secret from the secrets service
        const exists = secretsService.exists(name);
        const secretValue = exists ? secretsService.get(name) : undefined;

        plugin.process.send({
          type: 'secret-response',
          messageId,
          data: { value: secretValue },
        });
      }
    } catch (error) {
      plugin.process.send({
        type: 'secret-response',
        messageId,
        error: error.message,
      });
    }
  }

  /**
   * Send a request to a plugin
   */
  async sendRequest(pluginSlug, requestData) {
    const plugin = this.onlinePlugins.get(pluginSlug);

    if (!plugin) {
      throw new Error(`Plugin ${pluginSlug} is not online`);
    }

    if (!plugin.ready) {
      throw new Error(`Plugin ${pluginSlug} is not ready`);
    }

    const requestId = `${pluginSlug}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve, reject) => {
      // Store the promise callbacks
      plugin.pendingRequests.set(requestId, { resolve, reject });

      // Set a timeout
      const timeout = setTimeout(() => {
        plugin.pendingRequests.delete(requestId);
        reject(new Error(`Request to plugin ${pluginSlug} timed out`));
      }, 30000);

      // Send the request to the plugin
      plugin.process.send({
        type: 'request',
        requestId,
        ...requestData,
      });

      // Clear timeout when resolved
      const originalResolve = resolve;
      const originalReject = reject;

      plugin.pendingRequests.set(requestId, {
        resolve: data => {
          clearTimeout(timeout);
          originalResolve(data);
        },
        reject: error => {
          clearTimeout(timeout);
          originalReject(error);
        },
      });
    });
  }

  /**
   * Check if a plugin is online
   */
  isPluginOnline(pluginSlug) {
    const plugin = this.onlinePlugins.get(pluginSlug);
    return plugin && plugin.ready;
  }

  /**
   * Get plugin information
   */
  getPlugin(pluginSlug) {
    return this.onlinePlugins.get(pluginSlug);
  }

  /**
   * Get all online plugins
   */
  getOnlinePlugins() {
    return Array.from(this.onlinePlugins.keys());
  }

  /**
   * Get all bank sync plugins
   * Returns plugins that have bankSync configuration enabled
   */
  getBankSyncPlugins() {
    const bankSyncPlugins = [];

    for (const [slug, plugin] of this.onlinePlugins) {
      if (plugin.manifest?.bankSync?.enabled) {
        bankSyncPlugins.push({
          slug,
          name: plugin.manifest.name,
          displayName: plugin.manifest.bankSync.displayName,
          description:
            plugin.manifest.bankSync.description || plugin.manifest.description,
          version: plugin.manifest.version,
          endpoints: plugin.manifest.bankSync.endpoints,
          requiresAuth: plugin.manifest.bankSync.requiresAuth ?? true,
        });
      }
    }

    return bankSyncPlugins;
  }

  /**
   * Debug plugin routes and their authentication requirements
   * Only outputs when DEBUG=actual:config is set
   */
  debugPluginRoutes(pluginSlug) {
    const plugin = this.onlinePlugins.get(pluginSlug);
    if (!plugin || !plugin.manifest) {
      return;
    }

    const manifest = plugin.manifest;

    debug(`Plugin: ${pluginSlug}`);
    debug(`  Version: ${manifest.version}`);
    debug(`  Description: ${manifest.description || 'N/A'}`);
    debug(`  Entry: ${manifest.entry}`);

    // Show bank sync configuration if enabled
    if (manifest.bankSync && manifest.bankSync.enabled) {
      debug(`  Bank Sync: ${manifest.bankSync.displayName}`);
      debug(`    Status endpoint: ${manifest.bankSync.endpoints.status}`);
      debug(`    Accounts endpoint: ${manifest.bankSync.endpoints.accounts}`);
      debug(
        `    Transactions endpoint: ${manifest.bankSync.endpoints.transactions}`,
      );
      debug(`    Requires auth: ${manifest.bankSync.requiresAuth ?? true}`);
    }

    if (manifest.routes && manifest.routes.length > 0) {
      debug(`  Routes (${manifest.routes.length}):`);

      for (const route of manifest.routes) {
        const methods = route.methods.join(', ');
        const auth = route.auth || 'authenticated'; // Default to authenticated
        const authLabel =
          auth === 'anonymous'
            ? '🌍 anonymous'
            : auth === 'admin'
              ? '🔐 admin'
              : '🔒 authenticated';

        debug(
          `    ${authLabel} | ${methods.padEnd(15)} | /plugins-api/${pluginSlug}${route.path}`,
        );

        if (route.description) {
          debug(`      └─ ${route.description}`);
        }
      }
    } else {
      debug(`  Routes: none defined`);
    }

    debug(''); // Empty line for readability
  }

  /**
   * Shutdown all plugins
   */
  async shutdown() {
    const shutdownPromises = [];

    for (const [_pluginSlug, plugin] of this.onlinePlugins) {
      shutdownPromises.push(
        new Promise(resolve => {
          plugin.process.once('exit', resolve);
          plugin.process.kill();
        }),
      );
    }

    await Promise.all(shutdownPromises);
    this.onlinePlugins.clear();

    // Clean up extracted zip plugins
    for (const [pluginSlug, extractPath] of this.extractedPlugins) {
      try {
        if (fs.existsSync(extractPath)) {
          fs.rmSync(extractPath, { recursive: true, force: true });
          console.log(`Cleaned up extracted plugin: ${pluginSlug}`);
        }
      } catch (error) {
        console.error(
          `Failed to clean up plugin ${pluginSlug}:`,
          error.message,
        );
      }
    }
    this.extractedPlugins.clear();
  }
}

export { PluginManager };
