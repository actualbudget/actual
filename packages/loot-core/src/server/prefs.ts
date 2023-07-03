import { Timestamp } from '@actual-app/crdt';

import * as fs from '../platform/server/fs';

import { sendMessages } from './sync';

let prefs = null;

export async function loadPrefs(id?) {
  if (process.env.NODE_ENV === 'test' && !id) {
    prefs = { dummyTestPrefs: true };
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

export async function savePrefs(prefsToSet, { avoidSync = false } = {}) {
  Object.assign(prefs, prefsToSet);

  if (!avoidSync) {
    // Sync whitelisted prefs
    let messages = Object.keys(prefsToSet)
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

  if (!prefs.dummyTestPrefs) {
    let prefsPath = fs.join(fs.getBudgetDir(prefs.id), 'metadata.json');
    await fs.writeFile(prefsPath, JSON.stringify(prefs));
  }
}

export function unloadPrefs() {
  prefs = null;
}

export function getPrefs() {
  return prefs;
}

export function getDefaultPrefs(id, budgetName) {
  return { id, budgetName };
}

export async function readPrefs(id) {
  const fullpath = fs.join(fs.getBudgetDir(id), 'metadata.json');

  try {
    return JSON.parse(await fs.readFile(fullpath));
  } catch (e) {
    return null;
  }
}
