const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..'); // Equivalent to dirname(dirname("$0"))
const DEST = process.argv[2];

if (!DEST) {
  console.error('Error: Destination path is required as an argument.');
  process.exit(1);
}

// Remove the destination migrations directory if it exists
const migrationsPath = path.join(DEST, 'migrations');
if (fs.existsSync(migrationsPath)) {
  fs.rmSync(migrationsPath, { recursive: true, force: true });
}

// Create the destination migrations directory
fs.mkdirSync(migrationsPath, { recursive: true });

// Copy all files from the source migrations directory to the destination
const sourceMigrationsPath = path.join(ROOT, 'migrations');
const migrationFiles = fs.readdirSync(sourceMigrationsPath);
migrationFiles.forEach(file => {
  fs.copyFileSync(
    path.join(sourceMigrationsPath, file),
    path.join(migrationsPath, file),
  );
});

// Copy the default SQLite database file
const sourceDbPath = path.join(ROOT, 'default-db.sqlite');
const destinationDbPath = path.join(DEST, 'default-db.sqlite');
fs.copyFileSync(sourceDbPath, destinationDbPath);

console.log('Migration files and default database copied successfully.');
