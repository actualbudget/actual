import { addSyncListener, applyMessages } from './index';
import { Timestamp } from '../crdt';

function migrateParentIds(oldValues, newValues) {
  newValues.forEach((items, table) => {
    if (table === 'transactions') {
      let old = oldValues.get(table);
      let toApply = [];

      items.forEach(newValue => {
        if (
          newValue.isChild === 1 &&
          newValue.parent_id == null &&
          newValue.id.includes('/')
        ) {
          let parentId = newValue.id.split('/')[0];

          toApply.push({
            dataset: 'transactions',
            row: newValue.id,
            column: 'parent_id',
            value: parentId,
            timestamp: Timestamp.send()
          });
        }
      });

      if (toApply.length > 0) {
        applyMessages(toApply);
      }
    }
  });
}

let _unlisten = null;
export function listen() {
  unlisten();
  _unlisten = addSyncListener(migrateParentIds);
}

export function unlisten() {
  if (_unlisten) {
    _unlisten();
    _unlisten = null;
  }
}
