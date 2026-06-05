// @ts-strict-ignore
import {
  create,
  EncryptedDataSchema,
  fromBinary,
  MessageEnvelopeSchema,
  MessageSchema,
  SyncRequestSchema,
  SyncResponseSchema,
  Timestamp,
  toBinary,
} from '@actual-app/crdt';

import { logger } from '#platform/server/log';
import * as encryption from '#server/encryption';
import { SyncError } from '#server/errors';
import * as prefs from '#server/prefs';

import type { Message } from './index';

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
  const requestPb = create(SyncRequestSchema, {
    groupId,
    fileId,
    keyId: encryptKeyId ?? '',
    since: since.toString(),
  });

  for (const msg of messages) {
    const binaryMsg = toBinary(
      MessageSchema,
      create(MessageSchema, {
        dataset: msg.dataset,
        row: msg.row,
        column: msg.column,
        value: msg.value as string,
      }),
    );

    let content: Uint8Array;
    let isEncrypted: boolean;
    if (encryptKeyId) {
      let result;
      try {
        result = await encryption.encrypt(binaryMsg, encryptKeyId);
      } catch (e) {
        throw new SyncError('encrypt-failure', {
          isMissingKey: e.message === 'missing-key',
        });
      }

      content = toBinary(
        EncryptedDataSchema,
        create(EncryptedDataSchema, {
          data: result.value,
          iv: Buffer.from(result.meta.iv, 'base64'),
          authTag: Buffer.from(result.meta.authTag, 'base64'),
        }),
      );
      isEncrypted = true;
    } else {
      content = binaryMsg;
      isEncrypted = false;
    }

    requestPb.messages.push(
      create(MessageEnvelopeSchema, {
        timestamp: msg.timestamp.toString(),
        content,
        isEncrypted,
      }),
    );
  }

  return toBinary(SyncRequestSchema, requestPb);
}

export async function decode(
  data: Uint8Array,
): Promise<{ messages: Message[]; merkle: { hash: number } }> {
  const { encryptKeyId } = prefs.getPrefs();

  const responsePb = fromBinary(SyncResponseSchema, data);
  const merkle = JSON.parse(responsePb.merkle);
  const messages = [];

  for (const envelopePb of responsePb.messages) {
    let msg;

    if (envelopePb.isEncrypted) {
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
        logger.log(e);
        throw new SyncError('decrypt-failure', {
          isMissingKey: e.message === 'missing-key',
        });
      }

      msg = fromBinary(MessageSchema, decrypted);
    } else {
      msg = fromBinary(MessageSchema, envelopePb.content);
    }

    messages.push({
      timestamp: Timestamp.parse(envelopePb.timestamp),
      dataset: msg.dataset,
      row: msg.row,
      column: msg.column,
      value: msg.value,
    });
  }

  return { messages, merkle };
}
