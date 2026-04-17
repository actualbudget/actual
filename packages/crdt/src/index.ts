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
  EncryptedData,
  Message,
  MessageEnvelope,
  SyncProtoBuf,
  SyncRequest,
  SyncResponse,
} from './proto/compat';
