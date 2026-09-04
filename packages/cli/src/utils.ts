import { readFileSync } from 'fs';

/**
 * Suffix appended to an environment variable name to read its value from a
 * file instead, following the convention used by Docker secrets and Kubernetes
 * file-mounted secrets.
 */
export const FILE_ENV_SUFFIX = '_FILE';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads the value for `<name>_FILE`, or returns undefined when it is not set.
 *
 * Throws when the file cannot be read, rather than silently falling back to
 * the plain environment variable — a secret that failed to mount should stop
 * the command, not send an empty password to the server.
 */
export function readEnvFile(
  name: string,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const fileEnvVar = `${name}${FILE_ENV_SUFFIX}`;
  const filePath = env[fileEnvVar];

  if (!filePath) return undefined;

  try {
    return readFileSync(filePath, 'utf-8').trim();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not read ${fileEnvVar} from "${filePath}": ${reason}`,
    );
  }
}

/**
 * Reads an environment variable, preferring the `<name>_FILE` variant when it
 * is set.
 */
export function readEnv(
  name: string,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return readEnvFile(name, env) ?? env[name];
}

export function parseBoolFlag(value: string, flagName: string): boolean {
  if (value !== 'true' && value !== 'false') {
    throw new Error(
      `Invalid ${flagName}: "${value}". Expected "true" or "false".`,
    );
  }
  return value === 'true';
}

export function parseIntFlag(value: string, flagName: string): number {
  const parsed = value.trim() === '' ? NaN : Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ${flagName}: "${value}". Expected an integer.`);
  }
  return parsed;
}

export function parseNonNegativeIntFlag(
  value: string,
  flagName: string,
): number {
  const parsed = parseIntFlag(value, flagName);
  if (parsed < 0) {
    throw new Error(
      `Invalid ${flagName}: "${value}". Expected a non-negative integer.`,
    );
  }
  return parsed;
}

export function parseBoolEnv(
  raw: string | undefined,
  source: string,
): boolean | undefined {
  if (raw === undefined) return undefined;
  const lower = raw.toLowerCase();
  if (raw === '1' || lower === 'true') return true;
  if (raw === '0' || lower === 'false') return false;
  throw new Error(
    `Invalid ${source}: "${raw}". Expected "true", "false", "1", or "0".`,
  );
}
