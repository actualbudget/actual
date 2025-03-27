import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readMigrationFiles } from 'drizzle-orm/migrator';

const lootCoreRootPath = fileURLToPath(new URL('..', import.meta.url));

const migrations = readMigrationFiles({ migrationsFolder: './drizzle/' });

await writeFile(
  join(lootCoreRootPath, './drizzle/migrations.json'),
  JSON.stringify(migrations),
);

console.log('Migrations compiled!');
