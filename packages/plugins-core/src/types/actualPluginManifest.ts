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
  setup?: {
    type: 'plugin' | 'json';
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

function validateRoutes(routes: unknown, owner: string): void {
  if (routes == null) {
    return;
  }

  if (!Array.isArray(routes)) {
    throw new Error(`${owner}.routes must be an array`);
  }

  for (const route of routes) {
    if (!isRecord(route)) {
      throw new Error(`${owner}.routes entries must be objects`);
    }

    if (typeof route.path !== 'string' || route.path.length === 0) {
      throw new Error(`${owner}.routes entries must specify path`);
    }

    if (!isStringArray(route.methods) || route.methods.length === 0) {
      throw new Error(`${owner}.routes entries must specify methods`);
    }

    if (
      route.auth != null &&
      route.auth !== 'anonymous' &&
      route.auth !== 'authenticated' &&
      route.auth !== 'admin'
    ) {
      throw new Error(
        `${owner}.routes auth must be 'anonymous', 'authenticated', or 'admin'`,
      );
    }

    if (route.description != null && typeof route.description !== 'string') {
      throw new Error(`${owner}.routes description must be a string`);
    }
  }
}

function validateStringRecord(value: unknown, name: string): void {
  if (value == null) {
    return;
  }

  if (!isRecord(value)) {
    throw new Error(`${name} must be an object`);
  }

  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== 'string') {
      throw new Error(`${name}.${key} must be a string`);
    }
  }
}

function validateBankSync(bankSync: unknown): void {
  if (bankSync == null) {
    return;
  }

  if (!isRecord(bankSync)) {
    throw new Error('syncserver.bankSync must be an object');
  }

  if (typeof bankSync.enabled !== 'boolean') {
    throw new Error('syncserver.bankSync.enabled must be a boolean');
  }

  if (
    typeof bankSync.displayName !== 'string' ||
    bankSync.displayName.length === 0
  ) {
    throw new Error('syncserver.bankSync.displayName must be a string');
  }

  if (!isRecord(bankSync.endpoints)) {
    throw new Error('syncserver.bankSync.endpoints must be an object');
  }

  for (const endpointName of ['status', 'accounts', 'transactions']) {
    const endpoint = bankSync.endpoints[endpointName];
    if (endpoint != null && typeof endpoint !== 'string') {
      throw new Error(
        `syncserver.bankSync.endpoints.${endpointName} must be a string`,
      );
    }
  }

  if (
    bankSync.description != null &&
    typeof bankSync.description !== 'string'
  ) {
    throw new Error('syncserver.bankSync.description must be a string');
  }

  if (
    bankSync.requiresAuth != null &&
    typeof bankSync.requiresAuth !== 'boolean'
  ) {
    throw new Error('syncserver.bankSync.requiresAuth must be a boolean');
  }

  if (bankSync.setup != null) {
    if (!isRecord(bankSync.setup)) {
      throw new Error('syncserver.bankSync.setup must be an object');
    }

    if (bankSync.setup.type !== 'plugin' && bankSync.setup.type !== 'json') {
      throw new Error(
        "syncserver.bankSync.setup.type must be 'plugin' or 'json'",
      );
    }
  }
}

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

  validateRoutes(candidate.syncserver?.routes, 'syncserver');

  if (
    candidate.syncserver?.permissions != null &&
    !isStringArray(candidate.syncserver.permissions)
  ) {
    throw new Error('syncserver.permissions must be an array of strings');
  }

  if (
    candidate.syncserver?.storage != null &&
    !isRecord(candidate.syncserver.storage)
  ) {
    throw new Error('syncserver.storage must be an object');
  }

  validateStringRecord(
    candidate.syncserver?.dependencies,
    'syncserver.dependencies',
  );
  validateBankSync(candidate.syncserver?.bankSync);

  if (candidate.type === 'frontend' && candidate.syncserver != null) {
    throw new Error('Frontend-only plugins cannot specify syncserver config');
  }

  if (candidate.type === 'syncserver' && candidate.frontend != null) {
    throw new Error('Sync-server-only plugins cannot specify frontend config');
  }

  if (
    candidate.syncserver?.bankSync?.setup?.type === 'plugin' &&
    (candidate.type !== 'mixed' || candidate.frontend == null)
  ) {
    throw new Error(
      "Bank sync setup.type 'plugin' requires a mixed plugin with frontend config",
    );
  }

  return candidate as ActualPluginManifest;
}
