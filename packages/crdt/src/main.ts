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

export { Message, SyncError } from './types';

export * as encoder from './encoder';

export const SyncProtoBuf = SyncPb;
