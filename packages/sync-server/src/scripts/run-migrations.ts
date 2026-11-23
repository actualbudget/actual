import { run } from '#migrations';

const direction = process.argv[2] ?? 'up';

if (direction !== 'up' && direction !== 'down') {
  console.error(
    `Invalid migration direction "${direction}": use "up" or "down"`,
  );
  process.exit(1);
}

run(direction).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
