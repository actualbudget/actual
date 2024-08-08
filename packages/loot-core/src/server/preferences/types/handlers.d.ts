export interface PreferencesHandlers {
  'preferences-save': (arg: { id: string; value: string }) => Promise<unknown>;
}
