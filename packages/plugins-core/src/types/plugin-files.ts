/**
 * Plugin File Types
 *
 * Types for plugin file operations and storage.
 */

/**
 * Represents a single file within a plugin package
 */
export interface PluginFile {
  name: string;
  content: string;
}

/**
 * Collection of files that make up a plugin
 */
export type PluginFileCollection = PluginFile[];
