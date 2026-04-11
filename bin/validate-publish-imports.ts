import fs from 'node:fs';
import path from 'node:path';

/**
 * Derives publishConfig.imports from imports by:
 * 1. Prepending ./build/ to each value path
 * 2. Replacing .ts/.tsx extensions with .js
 */
export function derivePublishImports(
  imports: Record<string, string | object>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(imports)) {
    if (typeof value !== 'string') {
      throw new Error(
        `Unsupported imports target for "${key}". Expected a string path.`,
      );
    }
    const withBuildPrefix = value.replace(/^\.\//, './build/');
    const withJsExtension = withBuildPrefix.replace(/\.tsx?$/, '.js');
    result[key] = withJsExtension;
  }
  return result;
}

export type ValidationResult = {
  packagePath: string;
  packageName: string;
  missingKeys: string[];
  extraKeys: string[];
  wrongValues: Array<{ key: string; expected: string; actual: string }>;
};

/**
 * Validates publishConfig.imports against imports for a single package.json.
 * Returns null if the package should be skipped (no publishConfig.imports).
 * Returns a ValidationResult if the package has both fields.
 */
export function validatePackage(packageJsonPath: string): {
  result: ValidationResult | null;
  warnings: string[];
} {
  const warnings: string[] = [];
  const content = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const packageName: string = content.name ?? packageJsonPath;

  const imports: Record<string, string | object> | undefined = content.imports;
  const publishImports: Record<string, string> | undefined =
    content.publishConfig?.imports;

  // No publishConfig.imports → skip
  if (!publishImports) {
    return { result: null, warnings };
  }

  // Has publishConfig.imports but no imports → warn
  if (!imports) {
    warnings.push(
      `${packageName}: orphaned publishConfig.imports (no imports field)`,
    );
    return { result: null, warnings };
  }

  const expected = derivePublishImports(imports);
  const expectedKeys = new Set(Object.keys(expected));
  const actualKeys = new Set(Object.keys(publishImports));

  const missingKeys = [...expectedKeys].filter(k => !actualKeys.has(k));
  const extraKeys = [...actualKeys].filter(k => !expectedKeys.has(k));
  const wrongValues: ValidationResult['wrongValues'] = [];

  for (const key of expectedKeys) {
    if (actualKeys.has(key) && publishImports[key] !== expected[key]) {
      wrongValues.push({
        key,
        expected: expected[key],
        actual: publishImports[key],
      });
    }
  }

  return {
    result: {
      packagePath: packageJsonPath,
      packageName,
      missingKeys,
      extraKeys,
      wrongValues,
    },
    warnings,
  };
}

export function fixPackage(packageJsonPath: string): boolean {
  const raw = fs.readFileSync(packageJsonPath, 'utf-8');
  const content = JSON.parse(raw);

  if (!content.imports || !content.publishConfig?.imports) {
    return false;
  }

  const expected = derivePublishImports(content.imports);

  // Check if already correct
  if (
    JSON.stringify(content.publishConfig.imports) === JSON.stringify(expected)
  ) {
    return false;
  }

  content.publishConfig.imports = expected;
  fs.writeFileSync(packageJsonPath, JSON.stringify(content, null, 2) + '\n');
  return true;
}

function findPackageJsonFiles(): string[] {
  const packagesDir = path.resolve(__dirname, '..', 'packages');
  const entries = fs.readdirSync(packagesDir, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const pkgPath = path.join(packagesDir, entry.name, 'package.json');
      if (fs.existsSync(pkgPath)) {
        results.push(pkgPath);
      }
    }
  }
  return results;
}

function resolvePackageJsonPaths(filePaths: string[]): string[] {
  const packagesRoot = path.resolve(__dirname, '..', 'packages');
  const seen = new Set<string>();
  for (const filePath of filePaths) {
    const resolvedPath = path.resolve(filePath);
    let dir = path.dirname(resolvedPath);
    while (dir.startsWith(packagesRoot + path.sep)) {
      const candidate = path.join(dir, 'package.json');
      if (
        fs.existsSync(candidate) &&
        candidate.startsWith(packagesRoot + path.sep)
      ) {
        seen.add(candidate);
        break;
      }
      dir = path.dirname(dir);
    }
  }
  return [...seen];
}

function main() {
  const args = process.argv.slice(2);
  const fixMode = args.includes('--fix');
  const filePaths = args.filter(arg => !arg.startsWith('--'));

  const packageJsonFiles =
    filePaths.length > 0
      ? resolvePackageJsonPaths(filePaths)
      : findPackageJsonFiles();

  let hasErrors = false;
  const allWarnings: string[] = [];

  for (const pkgPath of packageJsonFiles) {
    if (fixMode) {
      const fixed = fixPackage(pkgPath);
      if (fixed) {
        const name = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).name;
        console.log(`Fixed publishConfig.imports in ${name}`);
      }
    } else {
      const { result, warnings } = validatePackage(pkgPath);
      allWarnings.push(...warnings);

      if (result) {
        const hasIssues =
          result.missingKeys.length > 0 ||
          result.extraKeys.length > 0 ||
          result.wrongValues.length > 0;

        if (hasIssues) {
          hasErrors = true;
          console.error(`\n${result.packageName}:`);

          for (const key of result.missingKeys) {
            console.error(`  Missing key: ${key}`);
          }
          for (const key of result.extraKeys) {
            console.error(`  Extra key: ${key}`);
          }
          for (const { key, expected, actual } of result.wrongValues) {
            console.error(`  Wrong value for ${key}:`);
            console.error(`    expected: ${expected}`);
            console.error(`    actual:   ${actual}`);
          }
        }
      }
    }
  }

  for (const warning of allWarnings) {
    console.warn(`Warning: ${warning}`);
  }

  if (hasErrors) {
    console.error(
      '\npublishConfig.imports is out of sync. Run with --fix to auto-fix.',
    );
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
