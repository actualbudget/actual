import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  derivePublishImports,
  validatePackage,
} from '../validate-publish-imports.js';

describe('derivePublishImports', () => {
  it('prepends ./build/ to .js paths', () => {
    const imports = {
      '#account-db': './src/account-db.js',
    };
    expect(derivePublishImports(imports)).toEqual({
      '#account-db': './build/src/account-db.js',
    });
  });

  it('converts .ts extension to .js and prepends ./build/', () => {
    const imports = {
      '#migrations': './src/migrations.ts',
    };
    expect(derivePublishImports(imports)).toEqual({
      '#migrations': './build/src/migrations.js',
    });
  });

  it('converts .tsx extension to .js and prepends ./build/', () => {
    const imports = {
      '#component': './src/component.tsx',
    };
    expect(derivePublishImports(imports)).toEqual({
      '#component': './build/src/component.js',
    });
  });

  it('preserves wildcard patterns', () => {
    const imports = {
      '#accounts/*': './src/accounts/*.js',
      '#services/*': './src/app-gocardless/services/*.ts',
    };
    expect(derivePublishImports(imports)).toEqual({
      '#accounts/*': './build/src/accounts/*.js',
      '#services/*': './build/src/app-gocardless/services/*.js',
    });
  });

  it('handles multiple entries with mixed extensions', () => {
    const imports = {
      '#account-db': './src/account-db.js',
      '#migrations': './src/migrations.ts',
      '#app-gocardless/errors': './src/app-gocardless/errors.ts',
      '#util/*': './src/util/*.ts',
      '#scripts/*': './src/scripts/*.js',
    };
    expect(derivePublishImports(imports)).toEqual({
      '#account-db': './build/src/account-db.js',
      '#migrations': './build/src/migrations.js',
      '#app-gocardless/errors': './build/src/app-gocardless/errors.js',
      '#util/*': './build/src/util/*.js',
      '#scripts/*': './build/src/scripts/*.js',
    });
  });

  it('returns empty object for empty imports', () => {
    expect(derivePublishImports({})).toEqual({});
  });

  it('throws error for non-string imports values', () => {
    const imports = {
      '#foo': './src/foo.js',
      '#conditional': {
        browser: './src/browser.js',
        node: './src/node.js',
      },
    };
    expect(() => derivePublishImports(imports)).toThrow(
      'Unsupported imports target for "#conditional". Expected a string path.',
    );
  });

  it('handles paths with /index.js suffix', () => {
    const imports = {
      '#util/title': './src/util/title/index.js',
    };
    expect(derivePublishImports(imports)).toEqual({
      '#util/title': './build/src/util/title/index.js',
    });
  });
});

describe('validatePackage', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-imports-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writePackageJson(content: Record<string, unknown>) {
    const filePath = path.join(tmpDir, 'package.json');
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
    return filePath;
  }

  it('skips packages with no publishConfig', () => {
    const filePath = writePackageJson({
      name: 'test-pkg',
      imports: { '#foo': './src/foo.js' },
    });
    const { result, warnings } = validatePackage(filePath);
    expect(result).toBeNull();
    expect(warnings).toEqual([]);
  });

  it('skips packages with publishConfig but no publishConfig.imports', () => {
    const filePath = writePackageJson({
      name: 'test-pkg',
      imports: { '#foo': './src/foo.js' },
      publishConfig: { access: 'public' },
    });
    const { result, warnings } = validatePackage(filePath);
    expect(result).toBeNull();
    expect(warnings).toEqual([]);
  });

  it('warns when publishConfig.imports exists but imports does not', () => {
    const filePath = writePackageJson({
      name: 'test-pkg',
      publishConfig: {
        imports: { '#foo': './build/src/foo.js' },
      },
    });
    const { result, warnings } = validatePackage(filePath);
    expect(result).toBeNull();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('orphaned');
  });

  it('returns no errors when publishConfig.imports matches', () => {
    const filePath = writePackageJson({
      name: 'test-pkg',
      imports: {
        '#foo': './src/foo.js',
        '#bar': './src/bar.ts',
      },
      publishConfig: {
        imports: {
          '#foo': './build/src/foo.js',
          '#bar': './build/src/bar.js',
        },
      },
    });
    const { result } = validatePackage(filePath);
    expect(result).not.toBeNull();
    expect(result!.missingKeys).toEqual([]);
    expect(result!.extraKeys).toEqual([]);
    expect(result!.wrongValues).toEqual([]);
  });

  it('detects missing keys in publishConfig.imports', () => {
    const filePath = writePackageJson({
      name: 'test-pkg',
      imports: {
        '#foo': './src/foo.js',
        '#bar': './src/bar.ts',
      },
      publishConfig: {
        imports: {
          '#foo': './build/src/foo.js',
        },
      },
    });
    const { result } = validatePackage(filePath);
    expect(result!.missingKeys).toEqual(['#bar']);
  });

  it('detects extra keys in publishConfig.imports', () => {
    const filePath = writePackageJson({
      name: 'test-pkg',
      imports: {
        '#foo': './src/foo.js',
      },
      publishConfig: {
        imports: {
          '#foo': './build/src/foo.js',
          '#orphan': './build/src/orphan.js',
        },
      },
    });
    const { result } = validatePackage(filePath);
    expect(result!.extraKeys).toEqual(['#orphan']);
  });

  it('detects wrong values in publishConfig.imports', () => {
    const filePath = writePackageJson({
      name: 'test-pkg',
      imports: {
        '#foo': './src/foo.ts',
      },
      publishConfig: {
        imports: {
          '#foo': './src/foo.ts',
        },
      },
    });
    const { result } = validatePackage(filePath);
    expect(result!.wrongValues).toEqual([
      { key: '#foo', expected: './build/src/foo.js', actual: './src/foo.ts' },
    ]);
  });
});
