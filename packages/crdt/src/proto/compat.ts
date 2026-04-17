import { create, fromBinary, toBinary } from '@bufbuild/protobuf';

import {
  EncryptedDataSchema,
  MessageEnvelopeSchema,
  MessageSchema,
  SyncRequestSchema,
  SyncResponseSchema,
} from './sync_pb';
import type {
  EncryptedData as EncryptedDataMsg,
  MessageEnvelope as MessageEnvelopeMsg,
  Message as MessageMsg,
  SyncRequest as SyncRequestMsg,
  SyncResponse as SyncResponseMsg,
} from './sync_pb';

export class EncryptedData {
  _msg: EncryptedDataMsg;

  constructor(msg?: EncryptedDataMsg) {
    this._msg = msg ?? create(EncryptedDataSchema);
  }

  setIv(v: Uint8Array): void {
    this._msg.iv = v;
  }
  setAuthtag(v: Uint8Array): void {
    this._msg.authTag = v;
  }
  setData(v: Uint8Array): void {
    this._msg.data = v;
  }
  getIv(): Uint8Array {
    return this._msg.iv;
  }
  getAuthtag(): Uint8Array {
    return this._msg.authTag;
  }
  getData(): Uint8Array {
    return this._msg.data;
  }

  serializeBinary(): Uint8Array {
    return toBinary(EncryptedDataSchema, this._msg);
  }

  static deserializeBinary(bytes: Uint8Array): EncryptedData {
    return new EncryptedData(fromBinary(EncryptedDataSchema, bytes));
  }
}

export class Message {
  _msg: MessageMsg;

  constructor(msg?: MessageMsg) {
    this._msg = msg ?? create(MessageSchema);
  }

  setDataset(v: string): void {
    this._msg.dataset = v;
  }
  setRow(v: string): void {
    this._msg.row = v;
  }
  setColumn(v: string): void {
    this._msg.column = v;
  }
  setValue(v: string): void {
    this._msg.value = v;
  }
  getDataset(): string {
    return this._msg.dataset;
  }
  getRow(): string {
    return this._msg.row;
  }
  getColumn(): string {
    return this._msg.column;
  }
  getValue(): string {
    return this._msg.value;
  }

  serializeBinary(): Uint8Array {
    return toBinary(MessageSchema, this._msg);
  }

  static deserializeBinary(bytes: Uint8Array): Message {
    return new Message(fromBinary(MessageSchema, bytes));
  }
}

export class MessageEnvelope {
  _msg: MessageEnvelopeMsg;

  constructor(msg?: MessageEnvelopeMsg) {
    this._msg = msg ?? create(MessageEnvelopeSchema);
  }

  setTimestamp(v: string): void {
    this._msg.timestamp = v;
  }
  setIsencrypted(v: boolean): void {
    this._msg.isEncrypted = v;
  }
  setContent(v: Uint8Array): void {
    this._msg.content = v;
  }
  getTimestamp(): string {
    return this._msg.timestamp;
  }
  getIsencrypted(): boolean {
    return this._msg.isEncrypted;
  }
  getContent(): Uint8Array {
    return this._msg.content;
  }
  getContent_asU8(): Uint8Array {
    return this._msg.content;
  }

  serializeBinary(): Uint8Array {
    return toBinary(MessageEnvelopeSchema, this._msg);
  }

  static deserializeBinary(bytes: Uint8Array): MessageEnvelope {
    return new MessageEnvelope(fromBinary(MessageEnvelopeSchema, bytes));
  }
}

export class SyncRequest {
  _msg: SyncRequestMsg;

  constructor(msg?: SyncRequestMsg) {
    this._msg = msg ?? create(SyncRequestSchema);
  }

  setFileid(v: string): void {
    this._msg.fileId = v;
  }
  setGroupid(v: string): void {
    this._msg.groupId = v;
  }
  setKeyid(v: string): void {
    this._msg.keyId = v;
  }
  setSince(v: string): void {
    this._msg.since = v;
  }
  addMessages(envelope: MessageEnvelope): void {
    this._msg.messages.push(envelope._msg);
  }
  getFileid(): string {
    return this._msg.fileId;
  }
  getGroupid(): string {
    return this._msg.groupId;
  }
  getKeyid(): string {
    return this._msg.keyId;
  }
  getSince(): string {
    return this._msg.since;
  }
  getMessagesList(): MessageEnvelope[] {
    return this._msg.messages.map(m => new MessageEnvelope(m));
  }

  serializeBinary(): Uint8Array {
    return toBinary(SyncRequestSchema, this._msg);
  }

  static deserializeBinary(bytes: Uint8Array): SyncRequest {
    return new SyncRequest(fromBinary(SyncRequestSchema, bytes));
  }
}

export class SyncResponse {
  _msg: SyncResponseMsg;

  constructor(msg?: SyncResponseMsg) {
    this._msg = msg ?? create(SyncResponseSchema);
  }

  setMerkle(v: string): void {
    this._msg.merkle = v;
  }
  addMessages(envelope: MessageEnvelope): void {
    this._msg.messages.push(envelope._msg);
  }
  getMerkle(): string {
    return this._msg.merkle;
  }
  getMessagesList(): MessageEnvelope[] {
    return this._msg.messages.map(m => new MessageEnvelope(m));
  }

  serializeBinary(): Uint8Array {
    return toBinary(SyncResponseSchema, this._msg);
  }

  static deserializeBinary(bytes: Uint8Array): SyncResponse {
    return new SyncResponse(fromBinary(SyncResponseSchema, bytes));
  }
}

export const SyncProtoBuf = {
  EncryptedData,
  Message,
  MessageEnvelope,
  SyncRequest,
  SyncResponse,
};
