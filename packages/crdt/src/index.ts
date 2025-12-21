/* oxlint-disable typescript/no-explicit-any */
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
export const SyncRequest = (globalThis as any).proto.SyncRequest;
export const SyncResponse = (globalThis as any).proto.SyncResponse;
export const Message = (globalThis as any).proto.Message;
export const MessageEnvelope = (globalThis as any).proto.MessageEnvelope;
export const EncryptedData = (globalThis as any).proto.EncryptedData;

export const SyncProtoBuf = (globalThis as any).proto;
