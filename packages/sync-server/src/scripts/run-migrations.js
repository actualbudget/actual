import { run } from '../migrations';

const direction = process.argv[2] || 'up';

run(direction).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
