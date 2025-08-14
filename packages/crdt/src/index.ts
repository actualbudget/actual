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
  SyncRequest,
  SyncResponse,
  Message,
  MessageEnvelope,
  EncryptedData,
  SyncRequestSchema,
  EncryptedDataSchema,
  MessageEnvelopeSchema,
  MessageSchema,
  SyncResponseSchema,
} from './proto/sync_pb';

export {
  create as createMessage,
  toBinary,
  fromBinary,
} from '@bufbuild/protobuf';
