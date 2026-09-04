import fs from 'node:fs';

/**
 * Suffix appended to an environment variable name to read its value from a
 * file instead. This is the convention used by Docker secrets and Kubernetes
 * file-mounted secrets, and lets deployments keep secrets out of the process
 * environment entirely.
 */
export const FILE_ENV_SUFFIX = '_FILE';

type SchemaNode = Record<string, unknown>;

export type EnvVarBinding = {
  /** The environment variable convict reads this setting from. */
  envVar: string;
  /** Dotted convict path, e.g. `openId.client_secret`. */
  path: string;
};

export type AppliedOverride = EnvVarBinding & {
  /** Path of the file the value was read from. */
  filePath: string;
  /** The value read from the file, already trimmed. */
  value: string;
  /**
   * Whether the plain environment variable was also set, and so has been
   * superseded by the file.
   */
  supersededEnvVar: boolean;
};

/** Minimal shape of a convict config; avoids depending on convict's types. */
type ConfigSchema = {
  set(path: string, value: unknown): unknown;
};

function isPlainObject(value: unknown): value is SchemaNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Whether a schema node describes a single setting rather than a group of
 * them. This mirrors convict's own rule in `normalizeSchema`: a non-empty
 * plain object without a `default` is a group, and anything else is a setting.
 *
 * Keying off `default` rather than off reserved key names matters, because the
 * schema has a setting literally named `env` (bound to `NODE_ENV`), which a
 * keyword-based check would skip.
 */
function isSettingDefinition(node: SchemaNode): boolean {
  return Object.keys(node).length === 0 || 'default' in node;
}

/**
 * Walks a convict schema definition and returns every setting that is bound to
 * an environment variable, paired with its dotted path.
 */
export function collectEnvVarBindings(schema: SchemaNode): EnvVarBinding[] {
  const bindings: EnvVarBinding[] = [];

  function walk(group: SchemaNode, path: string) {
    for (const [key, value] of Object.entries(group)) {
      // Skips a group's own `doc` string, and a setting's `format` array or
      // constructor — neither is a nested setting.
      if (!isPlainObject(value)) continue;

      const childPath = path ? `${path}.${key}` : key;

      if (!isSettingDefinition(value)) {
        walk(value, childPath);
      } else if (typeof value.env === 'string') {
        bindings.push({ envVar: value.env, path: childPath });
      }
    }
  }

  walk(schema, '');

  return bindings;
}

/**
 * Applies `<VAR>_FILE` overrides onto a convict config.
 *
 * Must be called *after* `loadFile()` and *before* `validate()`. convict
 * re-imports the environment at the end of both `load()` and `loadFile()`, so
 * anything applied earlier would be clobbered by the plain environment
 * variable; `set()` is not re-imported and therefore wins.
 *
 * Throws if a `_FILE` variable points at something unreadable, rather than
 * silently falling back to an empty value — a secret that failed to mount
 * should stop startup, not produce a server running with broken auth.
 */
export function applyFileEnvOverrides(
  config: ConfigSchema,
  bindings: EnvVarBinding[],
  env: NodeJS.ProcessEnv = process.env,
): AppliedOverride[] {
  const applied: AppliedOverride[] = [];

  for (const binding of bindings) {
    const fileEnvVar = `${binding.envVar}${FILE_ENV_SUFFIX}`;
    const filePath = env[fileEnvVar];

    if (!filePath) continue;

    let value;
    try {
      // Read directly rather than checking existence first, so a file removed
      // in between cannot slip past as a missing value.
      value = fs.readFileSync(filePath, 'utf8').trim();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Could not read ${fileEnvVar} from '${filePath}': ${reason}`,
      );
    }

    config.set(binding.path, value);

    applied.push({
      ...binding,
      filePath,
      value,
      supersededEnvVar: env[binding.envVar] !== undefined,
    });
  }

  return applied;
}
