import { type SyncedPrefs } from '../../types/prefs';
import { createApp } from '../app';
import * as db from '../db';
import { mutator } from '../mutators';
import { undoable } from '../undo';

import { PreferencesHandlers } from './types/handlers';

export const app = createApp<PreferencesHandlers>();

const savePreferences = async ({
  id,
  value,
}: {
  id: keyof SyncedPrefs;
  value: string | undefined;
}) => {
  await db.update('preferences', { id, value });
};

const getPreferences = async (): Promise<SyncedPrefs> => {
  const prefs = (await db.all('SELECT id, value FROM preferences')) as Array<{
    id: string;
    value: string;
  }>;

  return prefs.reduce<SyncedPrefs>((carry, { value, id }) => {
    carry[id as keyof SyncedPrefs] = value;
    return carry;
  }, {});
};

app.method('preferences/save', mutator(undoable(savePreferences)));
app.method('preferences/get', getPreferences);
