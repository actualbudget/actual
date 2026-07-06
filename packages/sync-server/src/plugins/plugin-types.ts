export type JsonRecord = Record<string, unknown>;
type ManifestBase = {
  name: string;
  version: string;
  description?: string;
};
type FrontendManifestConfig = {
  entry: string;
};
type SyncServerManifestConfig = {
  entry: string;
};
export type Manifest =
  | (ManifestBase & {
      type: 'frontend';
      frontend: FrontendManifestConfig;
      syncserver?: never;
    })
  | (ManifestBase & {
      type: 'syncserver';
      frontend?: never;
      syncserver: SyncServerManifestConfig;
    })
  | (ManifestBase & {
      type: 'mixed';
      frontend: FrontendManifestConfig;
      syncserver: SyncServerManifestConfig;
    });
export type PluginSource = {
  slug: string;
  manifest: Manifest;
  path: string;
  zipPath?: string | null;
};
export type FrontendManifest = Extract<
  Manifest,
  { frontend: FrontendManifestConfig }
>;
export type SyncServerManifest = Extract<
  Manifest,
  { syncserver: SyncServerManifestConfig }
>;
export type PluginSourceCandidate = {
  type: 'directory' | 'zip';
  name: string;
  slug: string;
  path: string;
  zipPath?: string;
};
export type DevPluginLocator = {
  port: string;
  path: string;
  search: string;
};
export type DevPluginLocatorInput =
  | string
  | number
  | {
      port?: unknown;
      path?: unknown;
      search?: unknown;
    };
export type FrontendPluginFile = {
  name: string;
  content: string;
  encoding: 'base64';
};
