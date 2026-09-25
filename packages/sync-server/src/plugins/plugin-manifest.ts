// This is a partial manifest shape: 01.01 only needs enough fields to validate
// plugin discovery/loading. Runtime capability fields move to the shared plugin
// contract package later in the stack once those capabilities are introduced.

type JsonRecord = Record<string, unknown>;
export type Manifest = {
  name: string;
  version: string;
  description?: string;
  type?: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return value != null && typeof value === 'object';
}

// Validates the shared manifest before any plugin code is imported or served.
export function validateManifest(manifest: unknown): Manifest {
  if (!isRecord(manifest)) {
    throw new Error('Plugin manifest must be an object');
  }

  const candidate = manifest as Partial<Manifest>;

  if (!candidate.name || typeof candidate.name !== 'string') {
    throw new Error('Plugin manifest must specify a name');
  }

  if (!candidate.version || typeof candidate.version !== 'string') {
    throw new Error('Plugin manifest must specify a version');
  }

  if (candidate.type !== undefined && typeof candidate.type !== 'string') {
    throw new Error('Plugin manifest type must be a string');
  }

  return candidate as Manifest;
}
