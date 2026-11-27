import fs from 'node:fs';

const newVersion = process.argv[2];
if (!newVersion) throw new Error('Usage: node bump-version.mjs <new-version>');

const manifestPath = `${import.meta.dirname}/../doc-versions.json`;
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

const oldVersion = manifest.current;
if (oldVersion !== newVersion) {
  const { next, [oldVersion]: _, ...olderVersions } = manifest.versions;
  const slug = oldVersion?.replaceAll('.', '-');
  manifest.versions = {
    ...(next ? { next } : {}),
    [newVersion]: 'https://actualbudget.org/docs/',
    ...(oldVersion
      ? {
          [oldVersion]: `https://v${slug}--actualbudget-website.netlify.app/docs/`,
        }
      : {}),
    ...olderVersions,
  };
}

manifest.current = newVersion;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Bumped current docs version from ${oldVersion} to ${newVersion}`);
