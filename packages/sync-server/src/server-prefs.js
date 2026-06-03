import { getServerPrefs, setServerPrefs } from './account-db.js';

export const PLUGINS_FLAG_PREF = 'flags.plugins';

export function arePluginsEnabled() {
  return getServerPrefs()[PLUGINS_FLAG_PREF] === 'true';
}

export function setPluginsEnabled(enabled) {
  setServerPrefs({
    [PLUGINS_FLAG_PREF]: enabled ? 'true' : 'false',
  });
}
