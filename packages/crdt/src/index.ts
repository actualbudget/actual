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

export {
  type EncryptedData,
  type Message,
  type MessageEnvelope,
  type SyncRequest,
  type SyncResponse,
  EncryptedDataSchema,
  MessageSchema,
  MessageEnvelopeSchema,
  SyncRequestSchema,
  SyncResponseSchema,
} from './proto/sync_pb';

export { create, fromBinary, toBinary } from '@bufbuild/protobuf';
