export { getClock, setClock, makeClock, makeClientId, serializeClock, deserializeClock, Timestamp, } from './crdt';
export { merkle } from './crdt';
import * as SyncPb from './proto/sync_pb';
export declare const SyncProtoBuf: typeof SyncPb;
