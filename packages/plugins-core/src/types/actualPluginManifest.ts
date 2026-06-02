export type ActualPluginType = 'frontend' | 'syncserver' | 'mixed';

export type ActualPluginFrontendManifest = {
  entry: string;
};

export type ActualPluginRoute = {
  path: string;
  methods: string[];
  auth?: 'anonymous' | 'authenticated' | 'admin';
  description?: string;
};

export type ActualPluginBankSyncConfig = {
  enabled: boolean;
  displayName: string;
  endpoints: {
    status?: string;
    accounts?: string;
    transactions?: string;
  };
  description?: string;
  requiresAuth?: boolean;
};

export type ActualPluginSyncServerManifest = {
  entry: string;
  routes?: ActualPluginRoute[];
  bankSync?: ActualPluginBankSyncConfig;
  permissions?: string[];
  storage?: Record<string, unknown>;
  dependencies?: Record<string, string>;
};

export type ActualPluginManifest = {
  name: string;
  version: string;
  description?: string;
  author?: string;
  type: ActualPluginType;
  frontend?: ActualPluginFrontendManifest;
  syncserver?: ActualPluginSyncServerManifest;

  // Legacy fields are kept optional so existing callers can migrate gradually.
  url?: string;
  enabled?: boolean;
  pluginType?: 'server' | 'client';
  minimumActualVersion?: string;
  main?: string;
  entry?: string;
  plugin?: Blob;
};

export function isFrontendPlugin(manifest: ActualPluginManifest): boolean {
  return manifest.type === 'frontend' || manifest.type === 'mixed';
}

export function isSyncServerPlugin(manifest: ActualPluginManifest): boolean {
  return manifest.type === 'syncserver' || manifest.type === 'mixed';
}

export function validateActualPluginManifest(
  manifest: unknown,
): ActualPluginManifest {
  if (typeof manifest !== 'object' || manifest == null) {
    throw new Error('Plugin manifest must be an object');
  }

  const candidate = manifest as Partial<ActualPluginManifest>;

  if (typeof candidate.name !== 'string' || candidate.name.length === 0) {
    throw new Error('Plugin manifest must specify a name');
  }

  if (typeof candidate.version !== 'string' || candidate.version.length === 0) {
    throw new Error('Plugin manifest must specify a version');
  }

  if (
    candidate.type !== 'frontend' &&
    candidate.type !== 'syncserver' &&
    candidate.type !== 'mixed'
  ) {
    throw new Error(
      "Plugin manifest type must be 'frontend', 'syncserver', or 'mixed'",
    );
  }

  if (isFrontendPlugin(candidate as ActualPluginManifest)) {
    if (
      typeof candidate.frontend?.entry !== 'string' ||
      candidate.frontend.entry.length === 0
    ) {
      throw new Error('Frontend plugins must specify frontend.entry');
    }
  }

  if (isSyncServerPlugin(candidate as ActualPluginManifest)) {
    if (
      typeof candidate.syncserver?.entry !== 'string' ||
      candidate.syncserver.entry.length === 0
    ) {
      throw new Error('Sync-server plugins must specify syncserver.entry');
    }
  }

  if (candidate.type === 'frontend' && candidate.syncserver != null) {
    throw new Error('Frontend-only plugins cannot specify syncserver config');
  }

  if (candidate.type === 'syncserver' && candidate.frontend != null) {
    throw new Error('Sync-server-only plugins cannot specify frontend config');
  }

  return candidate as ActualPluginManifest;
}
