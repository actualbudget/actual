import './proto/sync_pb.js'; // Import for side effects
import type * as SyncPb from './proto/sync_pb';

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

declare global {
  var proto: typeof SyncPb;
}

const { proto } = globalThis;

export const SyncRequest = proto.SyncRequest;
export const SyncResponse = proto.SyncResponse;
export const Message = proto.Message;
export const MessageEnvelope = proto.MessageEnvelope;
export const EncryptedData = proto.EncryptedData;

export const SyncProtoBuf = proto;
