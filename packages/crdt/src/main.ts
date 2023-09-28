import * as SyncPb from './proto/sync_pb';
export {
  merkle,
  getClock,
  setClock,
  makeClock,
  makeClientId,
  serializeClock,
  deserializeClock,
  type Clock,
  Timestamp,
} from './crdt';

export const SyncProtoBuf = SyncPb;
