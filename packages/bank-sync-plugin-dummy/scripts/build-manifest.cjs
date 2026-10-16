const fs = require('fs');
const path = require('path');

async function buildManifest() {
  const { manifest } = await import('../dist/src/manifest.js');
  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;

  fs.writeFileSync(path.join(__dirname, '..', 'manifest.json'), manifestJson);
  fs.mkdirSync(path.join(__dirname, '..', 'dist', 'plugin'), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(__dirname, '..', 'dist', 'plugin', 'manifest.json'),
    manifestJson,
  );
}

buildManifest().catch(error => {
  console.error('Failed to build dummy plugin manifest:', error);
  process.exitCode = 1;
});
