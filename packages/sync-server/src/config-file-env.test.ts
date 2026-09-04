import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import convict from 'convict';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  applyFileEnvOverrides,
  collectEnvVarBindings,
} from './config-file-env';

describe('collectEnvVarBindings', () => {
  it('collects top-level and nested settings with their dotted paths', () => {
    const bindings = collectEnvVarBindings({
      port: { doc: 'Port', format: 'port', default: 5006, env: 'TEST_PORT' },
      openId: {
        doc: 'OpenID settings.',
        client_secret: { format: String, default: '', env: 'TEST_SECRET' },
        issuer: {
          doc: 'Issuer',
          name: { format: String, default: '', env: 'TEST_ISSUER_NAME' },
        },
      },
    });

    expect(bindings).toEqual([
      { envVar: 'TEST_PORT', path: 'port' },
      { envVar: 'TEST_SECRET', path: 'openId.client_secret' },
      { envVar: 'TEST_ISSUER_NAME', path: 'openId.issuer.name' },
    ]);
  });

  it('treats a setting named "env" as a setting, not as a convict keyword', () => {
    // The real schema has a top-level `env` setting bound to NODE_ENV, which
    // must not be confused with the `env` keyword of a setting definition.
    const bindings = collectEnvVarBindings({
      env: {
        doc: 'The application environment.',
        format: ['production', 'development', 'test'],
        default: 'development',
        env: 'NODE_ENV',
      },
    });

    expect(bindings).toEqual([{ envVar: 'NODE_ENV', path: 'env' }]);
  });

  it('ignores settings that are not bound to an environment variable', () => {
    const bindings = collectEnvVarBindings({
      projectRoot: { doc: 'Project root.', format: String, default: '/app' },
    });

    expect(bindings).toEqual([]);
  });

  it('does not descend into object-valued convict keywords', () => {
    const bindings = collectEnvVarBindings({
      group: {
        doc: 'A group whose default is an object.',
        nested: {
          format: Object,
          default: { env: 'NOT_A_SETTING' },
          env: 'TEST_NESTED',
        },
      },
    });

    expect(bindings).toEqual([{ envVar: 'TEST_NESTED', path: 'group.nested' }]);
  });
});

describe('applyFileEnvOverrides', () => {
  let dir: string;

  const buildSchema = () =>
    convict({
      port: { doc: 'Port', format: 'port', default: 5006, env: 'TEST_PORT' },
      openId: {
        doc: 'OpenID settings.',
        client_secret: {
          doc: 'Client secret',
          format: String,
          default: '',
          env: 'TEST_SECRET',
        },
      },
    });

  const writeSecret = (name: string, contents: string) => {
    const filePath = join(dir, name);
    writeFileSync(filePath, contents);
    return filePath;
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'actual-config-file-env-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads the value from the file named by <VAR>_FILE', () => {
    const config = buildSchema();
    const filePath = writeSecret('secret', 'from-file');

    const applied = applyFileEnvOverrides(
      config,
      [{ envVar: 'TEST_SECRET', path: 'openId.client_secret' }],
      { TEST_SECRET_FILE: filePath },
    );

    expect(config.get('openId.client_secret')).toBe('from-file');
    expect(applied).toEqual([
      {
        envVar: 'TEST_SECRET',
        path: 'openId.client_secret',
        filePath,
        value: 'from-file',
        supersededEnvVar: false,
      },
    ]);
  });

  it('strips the trailing newline that most tooling appends', () => {
    const config = buildSchema();
    const filePath = writeSecret('secret', '  from-file\n');

    applyFileEnvOverrides(
      config,
      [{ envVar: 'TEST_SECRET', path: 'openId.client_secret' }],
      { TEST_SECRET_FILE: filePath },
    );

    expect(config.get('openId.client_secret')).toBe('from-file');
  });

  it('takes precedence over the plain environment variable', () => {
    const config = buildSchema();
    const filePath = writeSecret('secret', 'from-file');

    // convict has already imported TEST_SECRET at this point, exactly as it
    // would at startup.
    config.set('openId.client_secret', 'from-env');

    const applied = applyFileEnvOverrides(
      config,
      [{ envVar: 'TEST_SECRET', path: 'openId.client_secret' }],
      { TEST_SECRET: 'from-env', TEST_SECRET_FILE: filePath },
    );

    expect(config.get('openId.client_secret')).toBe('from-file');
    expect(applied[0].supersededEnvVar).toBe(true);
  });

  it('leaves settings alone when no _FILE variable is set', () => {
    const config = buildSchema();

    const applied = applyFileEnvOverrides(
      config,
      [{ envVar: 'TEST_SECRET', path: 'openId.client_secret' }],
      {},
    );

    expect(applied).toEqual([]);
    expect(config.get('openId.client_secret')).toBe('');
  });

  it('coerces values for non-string formats', () => {
    const config = buildSchema();
    const filePath = writeSecret('port', '1234\n');

    applyFileEnvOverrides(config, [{ envVar: 'TEST_PORT', path: 'port' }], {
      TEST_PORT_FILE: filePath,
    });

    expect(config.get('port')).toBe(1234);
    expect(() => config.validate({ allowed: 'strict' })).not.toThrow();
  });

  it('throws when the file cannot be read, naming the variable and path', () => {
    const config = buildSchema();
    const missing = join(dir, 'does-not-exist');

    expect(() =>
      applyFileEnvOverrides(
        config,
        [{ envVar: 'TEST_SECRET', path: 'openId.client_secret' }],
        { TEST_SECRET_FILE: missing },
      ),
    ).toThrow(`Could not read TEST_SECRET_FILE from '${missing}'`);
  });
});
