import runMigrations from './src/migrations.js';

export default async function teardown() {
  await runMigrations('down');
}
