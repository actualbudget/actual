import './proto/sync_pb.js'; // Import for side effects

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

// Access global proto namespace
export const SyncRequest = globalThis.proto.SyncRequest;
export const SyncResponse = globalThis.proto.SyncResponse;
export const Message = globalThis.proto.Message;
export const MessageEnvelope = globalThis.proto.MessageEnvelope;
export const EncryptedData = globalThis.proto.EncryptedData;

export const SyncProtoBuf = globalThis.proto;
