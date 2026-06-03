import { setPluginsEnabled } from '#server-prefs';

try {
  setPluginsEnabled(true);
  console.log('Plugins enabled!');
  console.log('Restart the sync server for this change to take effect.');
} catch (err) {
  console.log('Unexpected error:', err);
  console.log(
    'Please report this as an issue: https://github.com/actualbudget/actual-server/issues',
  );
  process.exit(1);
}
