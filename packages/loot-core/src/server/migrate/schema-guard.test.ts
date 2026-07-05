import * as nativeFs from 'fs';
import * as path from 'path';

import * as db from '#server/db';

import { migrate, withMigrationsDir } from './migrations';
import {
  computeRetiredNames,
  diffSchemaSnapshots,
  findRetiredNameViolations,
  getSchemaSnapshot,
  mergeRetiredNames,
  serializeRetiredNames,
  serializeSchemaSnapshot,
} from './schema-guard';
import type { RetiredNames, SchemaSnapshot } from './schema-guard';

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', '..', 'migrations');
const SNAPSHOT_PATH = path.join(__dirname, 'schema-snapshot.json');
const RETIRED_NAMES_PATH = path.join(__dirname, 'retired-names.json');

const POLICY_URL =
  'https://actualbudget.org/docs/contributing/project-details/migrations';

const isUpdatingSnapshot = process.env.SCHEMA_SNAPSHOT_UPDATE === 'true';
const isBreakingChangeAllowed =
  process.env.SCHEMA_SNAPSHOT_ALLOW_BREAKING === 'true';

beforeEach(global.emptyDatabase(true));

async function buildCurrentSnapshot(): Promise<SchemaSnapshot> {
  let snapshot: SchemaSnapshot | null = null;
  await withMigrationsDir(MIGRATIONS_DIR, async () => {
    const database = db.getDatabase();
    if (database == null) {
      throw new Error('Database is not initialized');
    }
    await migrate(database);
    snapshot = getSchemaSnapshot(database);
  });
  if (snapshot == null) {
    throw new Error('Failed to build a schema snapshot');
  }
  return snapshot;
}

function readBaselineSnapshot(): SchemaSnapshot | null {
  if (!nativeFs.existsSync(SNAPSHOT_PATH)) {
    return null;
  }
  return JSON.parse(
    nativeFs.readFileSync(SNAPSHOT_PATH, 'utf8'),
  ) as SchemaSnapshot;
}

function readRetiredNames(): RetiredNames {
  if (!nativeFs.existsSync(RETIRED_NAMES_PATH)) {
    return { tables: [], columns: [] };
  }
  return JSON.parse(
    nativeFs.readFileSync(RETIRED_NAMES_PATH, 'utf8'),
  ) as RetiredNames;
}

function formatList(items: string[]): string {
  return items.map(item => `  - ${item}`).join('\n');
}

describe('Migration schema guard', () => {
  test('migrations only make additive schema changes', async () => {
    const current = await buildCurrentSnapshot();

    if (isUpdatingSnapshot) {
      const baseline = readBaselineSnapshot();
      if (baseline) {
        const diff = diffSchemaSnapshots(baseline, current);
        if (diff.breakages.length > 0) {
          if (!isBreakingChangeAllowed) {
            throw new Error(
              'Refusing to update the schema snapshot: the current ' +
                'migrations remove or change existing schema, which breaks ' +
                'older clients syncing the same budget file:\n' +
                formatList(diff.breakages) +
                '\n\nMigrations must be additive-only. See ' +
                POLICY_URL +
                '\nIf this breaking change has been explicitly approved by ' +
                'the maintainers, re-run with ' +
                'SCHEMA_SNAPSHOT_ALLOW_BREAKING=true to record it.',
            );
          }

          const retired = mergeRetiredNames(
            readRetiredNames(),
            computeRetiredNames(baseline, current),
          );
          nativeFs.writeFileSync(
            RETIRED_NAMES_PATH,
            serializeRetiredNames(retired),
          );
          console.log(
            'Recorded retired schema names in retired-names.json:\n' +
              formatList(diff.breakages),
          );
        }
      }

      nativeFs.writeFileSync(SNAPSHOT_PATH, serializeSchemaSnapshot(current));
      console.log('Updated schema-snapshot.json');
      return;
    }

    const baseline = readBaselineSnapshot();
    if (baseline == null) {
      throw new Error(
        'Missing schema-snapshot.json. Run `yarn generate:schema-snapshot` ' +
          'from the repository root and commit the result.',
      );
    }

    const diff = diffSchemaSnapshots(baseline, current);

    if (diff.breakages.length > 0) {
      throw new Error(
        'Migrations must be additive-only, but the following schema was ' +
          'removed or changed:\n' +
          formatList(diff.breakages) +
          '\n\nRemoving or changing existing tables, columns, or indexes ' +
          'breaks older clients that sync against the same budget file. ' +
          'See ' +
          POLICY_URL,
      );
    }

    if (diff.additions.length > 0) {
      throw new Error(
        'The database schema changed (additively):\n' +
          formatList(diff.additions) +
          '\n\nRun `yarn generate:schema-snapshot` from the repository root ' +
          'and commit the updated schema-snapshot.json.',
      );
    }
  });

  test('retired schema names are not reused', async () => {
    const current = await buildCurrentSnapshot();
    const violations = findRetiredNameViolations(readRetiredNames(), current);

    if (violations.length > 0) {
      throw new Error(
        'Migrations reintroduce schema names that were retired by an ' +
          'earlier breaking change:\n' +
          formatList(violations) +
          '\n\nHistorical sync messages referencing these names still ' +
          'exist and would repopulate them with stale data. Pick a ' +
          'different name. See ' +
          POLICY_URL,
      );
    }
  });
});
