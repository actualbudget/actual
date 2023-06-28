import * as SyncPb from './proto/sync_pb';
export {
  merkle,
  getClock,
  setClock,
  makeClock,
  makeClientId,
  serializeClock,
  deserializeClock,
  Timestamp,
} from './crdt';

export const SyncProtoBuf = SyncPb;

export type Message = {
  column: string;
  dataset: string;
  old?: unknown;
  row: string;
  timestamp: string;
  value: string | number | null;
};
