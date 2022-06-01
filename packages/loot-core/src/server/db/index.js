import * as sqlite from '../../platform/server/sqlite';
import { sendMessages } from '../sync';
import { schema, schemaConfig } from '../aql/schema';
import {
  accountModel,
  categoryModel,
  categoryGroupModel,
  payeeModel,
  payeeRuleModel
} from '../models';
import { groupById } from '../../shared/util';
import {
  makeClock,
  setClock,
  serializeClock,
  deserializeClock,
  makeClientId,
  Timestamp
} from '../crdt';
import {
  convertForInsert,
  convertForUpdate,
  convertFromSelect
} from '../aql/schema-helpers';
import { getDatabase } from './db-connection';

export { toDateRepr, fromDateRepr } from '../models';
export * from "./db-actions"
export * from "./db-connection"
export * from "./accounts";
export * from "./categories";
export * from "./payees";
export * from "./transactions";

export async function loadClock() {
  let row = await first('SELECT * FROM messages_clock');
  if (row) {
    let clock = deserializeClock(row.clock);
    setClock(clock);
  } else {
    // No clock exists yet (first run of the app), so create a default
    // one.
    let timestamp = new Timestamp(0, 0, makeClientId());
    let clock = makeClock(timestamp);
    setClock(clock);

    await runQuery('INSERT INTO messages_clock (id, clock) VALUES (?, ?)', [
      1,
      serializeClock(clock)
    ]);
  }
}
