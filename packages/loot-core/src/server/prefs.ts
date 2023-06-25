import { Timestamp } from '@actual-app/crdt';

import * as fs from '../platform/server/fs';

import { Message, sendMessages } from './sync';

export const BUDGET_TYPES = ['report', 'rollover'] as const;
export type BudgetType = (typeof BUDGET_TYPES)[number];

type Preferences = {
  id: string;
  budgetName: string;
  budgetType?: BudgetType;
  clientId?: string;
  groupId?: string;
  userId?: string;
  lastSyncedTimestamp?: string;
  lastScheduleRun?: string;
  resetClock?: boolean;
  cloudFileId?: string;
  lastUploaded?: string;
  encryptKeyId?: string;
  'notifications.schedules'?: boolean;
  'notifications.repair-splits'?: boolean;
  isCached?: boolean;
};

let prefs: Preferences = null;

export async function loadPrefs(
  id?: string,
): Promise<Preferences> {
  if (process.env.NODE_ENV === 'test' && !id) {
    // Needed so that we can make preferences object non-null for testing.
    prefs = getDefaultPrefs("test", "test_preferences") 
    return prefs;
  }

  const fullpath = fs.join(fs.getBudgetDir(id), 'metadata.json');

  try {
    prefs = JSON.parse(await fs.readFile(fullpath));
  } catch (e) {
    // If the user messed something up, be flexible and allow them to
    // still load the budget database. Default the budget name to the
    // id.
    prefs = { id, budgetName: id };
  }

  // delete released feature flags
  let releasedFeatures = ['syncAccount'];
  for (const feature of releasedFeatures) {
    delete prefs[`flags.${feature}`];
  }

  // delete legacy notifications
  for (const key of Object.keys(prefs)) {
    if (key.startsWith('notifications.')) {
      delete prefs[key];
    }
  }

  // No matter what is in `id` field, force it to be the current id.
  // This makes it resilient to users moving around folders, etc
  prefs.id = id;
  return prefs;
}

export async function savePrefs(
  prefsToSet: Partial<Preferences>,
  { avoidSync = false } = {},
): Promise<void> {
  Object.assign(prefs, prefsToSet);

  if (!avoidSync) {
    // Sync whitelisted prefs
    const messages: Message[] = Object.keys(prefsToSet)
      .map(key => {
        if (key === 'budgetType' || key === 'budgetName') {
          return {
            dataset: 'prefs',
            row: key,
            column: 'value',
            value: prefsToSet[key],
            timestamp: Timestamp.send(),
          };
        }
        return null;
      })
      .filter(x => x !== null);

    if (messages.length > 0) {
      await sendMessages(messages);
    }
  }

  if (process.env.NODE_ENV !== 'test') {
    let prefsPath = fs.join(fs.getBudgetDir(prefs.id), 'metadata.json');
    await fs.writeFile(prefsPath, JSON.stringify(prefs));
  }
}

export function unloadPrefs(): void {
  prefs = null;
}

export function getPrefs(): Preferences {
  return prefs;
}

export function getDefaultPrefs(id: string, budgetName: string): Preferences {
  return { id, budgetName };
}

export async function readPrefs(id: string): Promise<Preferences> {
  const fullpath = fs.join(fs.getBudgetDir(id), 'metadata.json');

  try {
    return JSON.parse(await fs.readFile(fullpath));
  } catch (e) {
    return null;
  }
}
