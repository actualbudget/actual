import { addSyncListener } from '../sync/index';

import * as db from './index';

// This file keeps all the mappings in memory so we can access it
// synchronously. This is primarily used in the rules system, but
// there may be other uses in the future. You don't need to worry
// about this generally; if you are querying transactions, ids are
// transparently mapped for you. But if you are building something
// that stores ids and later uses them, you need to remember to map
// the ids.
//
// IMPORTANT: `loadMappings` must be called first before other modules
// that listen for sync changes. This must be the first sync listener
// to run in case other listeners use this mapping table; otherwise
// they might see stale mappings.

let allMappings;
let unlistenSync;

export async function loadMappings() {
  // The mappings are separated into tables specific to the type of
  // data. But you know, we really could keep a global mapping table.
  let categories = (await db.all('SELECT * FROM category_mapping')).map(r => [
    r.id,
    r.transferId
  ]);
  let payees = (await db.all('SELECT * FROM payee_mapping')).map(r => [
    r.id,
    r.targetId
  ]);

  // All ids are unique, so we can just keep a global table of mappings
  allMappings = new Map(categories.concat(payees));

  if (unlistenSync) {
    unlistenSync();
  }
  unlistenSync = addSyncListener(onApplySync);
}

function onApplySync(oldValues, newValues) {
  newValues.forEach((items, table) => {
    if (table.indexOf('mapping') !== -1) {
      let field = table === 'category_mapping' ? 'transferId' : 'targetId';

      items.forEach(newValue => {
        allMappings.set(newValue.id, newValue[field]);
      });
    }
  });
}

export function getMappings() {
  return allMappings;
}

export function getMapping(id) {
  return allMappings.get(id) || null;
}
