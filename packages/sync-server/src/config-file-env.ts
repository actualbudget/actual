import fs from 'node:fs';

/** Minimal shape of a convict config; avoids depending on convict's types. */
type ConfigSchema = {
  set(path: string, value: unknown): unknown;
};

/**
 * Reads the value of a `<VAR>_FILE` environment variable, returning the
 * contents of the file it points at.
 *
 * Only an unset variable returns undefined. A variable that is set but
 * unreadable — including an empty value, which means a mount produced no
 * path — throws, because a secret that failed to mount should stop startup
 * rather than leave the server running with an empty value.
 */
export function readFileEnv(
  fileEnvVar: string,
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  const filePath = env[fileEnvVar];

  if (filePath === undefined) return undefined;

  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not read ${fileEnvVar} from '${filePath}': ${reason}`,
    );
  }
}

/**
 * Applies a `<VAR>_FILE` override onto a convict setting, returning whether
 * one was applied.
 *
 * Must be called *after* `loadFile()` and *before* `validate()`. convict
 * re-imports the environment at the end of both `load()` and `loadFile()`, so
 * an override applied any earlier would be clobbered by the plain environment
 * variable; `set()` is not re-imported and therefore wins.
 */
export function applyFileEnv(
  config: ConfigSchema,
  fileEnvVar: string,
  path: string,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const value = readFileEnv(fileEnvVar, env);

  if (value === undefined) return false;

  config.set(path, value);

  return true;
}
