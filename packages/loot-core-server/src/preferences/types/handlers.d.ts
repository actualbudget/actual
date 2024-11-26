import { type SyncedPrefs } from 'loot-core-shared/types/prefs';

export interface PreferencesHandlers {
  'preferences/save': (arg: {
    id: keyof SyncedPrefs;
    value: string | undefined;
  }) => Promise<void>;

  'preferences/get': () => Promise<SyncedPrefs>;
}
