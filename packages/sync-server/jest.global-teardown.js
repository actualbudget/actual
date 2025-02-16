import { run as runMigrations } from './src/migrations.js';

// eslint-disable-next-line import/no-default-export
export default async function teardown() {
  await runMigrations('down');
}
