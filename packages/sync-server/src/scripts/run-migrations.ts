import { run } from '#migrations';

const direction = (process.argv[2] as 'up' | 'down') || 'up';

run(direction).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
