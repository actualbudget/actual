import Timestamp, {
  makeClock,
  setClock,
  serializeClock,
  deserializeClock,
  makeClientId
} from '../timestamp';
import { first, runQuery } from './db-actions';

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
