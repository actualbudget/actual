// @ts-strict-ignore
import { Timestamp } from '@actual-app/crdt';

import * as fs from '../platform/server/fs';
import type { LocalPrefs } from '../types/prefs';

import { Message, sendMessages } from './sync';

export const BUDGET_TYPES = ['report', 'rollover'] as const;
export type BudgetType = (typeof BUDGET_TYPES)[number];

let prefs: LocalPrefs = null;

export async function loadPrefs(id?: string): Promise<LocalPrefs> {
  if (process.env.NODE_ENV === 'test' && !id) {
    prefs = getDefaultPrefs('test', 'test_LocalPrefs');
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
  const releasedFeatures = ['syncAccount'];
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
  prefsToSet: LocalPrefs,
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
      .filter(x => x);

    if (messages.length > 0) {
      await sendMessages(messages);
    }
  }

  if (process.env.NODE_ENV !== 'test') {
    const prefsPath = fs.join(fs.getBudgetDir(prefs.id), 'metadata.json');
    await fs.writeFile(prefsPath, JSON.stringify(prefs));
  }
}

export function unloadPrefs(): void {
  prefs = null;
}

export function getPrefs(): LocalPrefs {
  return prefs;
}

export function getDefaultPrefs(id: string, budgetName: string): LocalPrefs {
  return { id, budgetName };
}
