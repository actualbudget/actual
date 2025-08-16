// @ts-strict-ignore
import {
  Timestamp,
  createMessage,
  SyncRequestSchema,
  MessageEnvelopeSchema,
  MessageSchema,
  toBinary,
  EncryptedDataSchema,
  fromBinary,
  SyncResponseSchema,
} from '@actual-app/crdt';

import * as encryption from '../encryption';
import { SyncError } from '../errors';
import * as prefs from '../prefs';

import { Message } from './index';

function coerceBuffer(value) {
  // The web encryption APIs give us back raw Uint8Array... but our
  // encryption code assumes we can work with it as a buffer. This is
  // a leaky abstraction and ideally the our abstraction over the web
  // encryption APIs should do this.
  if (!Buffer.isBuffer(value)) {
    return Buffer.from(value);
  }
  return value;
}

export async function encode(
  groupId: string,
  fileId: string,
  since: Timestamp | string,
  messages: Message[],
): Promise<Uint8Array> {
  const { encryptKeyId } = prefs.getPrefs();
  const requestPb = createMessage(SyncRequestSchema);

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const envelopePb = createMessage(MessageEnvelopeSchema, {
      timestamp: msg.timestamp.toString(),
    });

    const messagePb = createMessage(MessageSchema, {
      dataset: msg.dataset,
      row: msg.row,
      column: msg.column,
      value: msg.value as string,
    });

    const binaryMsg = toBinary(MessageSchema, messagePb);

    if (encryptKeyId) {
      const encrypted = createMessage(EncryptedDataSchema);

      let result;
      try {
        result = await encryption.encrypt(binaryMsg, encryptKeyId);
      } catch (e) {
        throw new SyncError('encrypt-failure', {
          isMissingKey: e.message === 'missing-key',
        });
      }

      encrypted.data = result.value;
      encrypted.iv = Buffer.from(result.meta.iv, 'base64');
      encrypted.authTag = Buffer.from(result.meta.authTag, 'base64');

      envelopePb.content = toBinary(EncryptedDataSchema, encrypted);
      envelopePb.isEncrypted = true;
    } else {
      envelopePb.content = binaryMsg;
    }

    requestPb.messages.push(envelopePb);
  }

  requestPb.groupId = groupId;
  requestPb.fileId = fileId;
  requestPb.keyId = encryptKeyId || undefined; // protobuf needs undefined instead of null - nulls are stringified as 'null'
  requestPb.since = since.toString();

  return toBinary(SyncRequestSchema, requestPb);
}

export async function decode(
  data: Uint8Array,
): Promise<{ messages: Message[]; merkle: { hash: number } }> {
  const { encryptKeyId } = prefs.getPrefs();

  const responsePb = fromBinary(SyncResponseSchema, data);
  const merkle = JSON.parse(responsePb.merkle);
  const list = responsePb.messages;
  const messages: Message[] = [];

  for (let i = 0; i < list.length; i++) {
    const envelopePb = list[i];
    const timestamp = Timestamp.parse(envelopePb.timestamp);
    const encrypted = envelopePb.isEncrypted;
    let msg;

    if (encrypted) {
      const binary = fromBinary(EncryptedDataSchema, envelopePb.content);

      let decrypted;
      try {
        decrypted = await encryption.decrypt(coerceBuffer(binary.data), {
          keyId: encryptKeyId,
          algorithm: 'aes-256-gcm',
          iv: coerceBuffer(binary.iv),
          authTag: coerceBuffer(binary.authTag),
        });
      } catch (e) {
        console.log(e);
        throw new SyncError('decrypt-failure', {
          isMissingKey: e.message === 'missing-key',
        });
      }

      msg = fromBinary(MessageSchema, decrypted);
    } else {
      msg = fromBinary(MessageSchema, envelopePb.content);
    }

    messages.push({
      timestamp,
      dataset: msg.dataset,
      row: msg.row,
      column: msg.column,
      value: msg.value,
    });
  }

  return { messages, merkle };
}
