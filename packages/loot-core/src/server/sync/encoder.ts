// @ts-strict-ignore
import { SyncProtoBuf, Timestamp } from '@actual-app/crdt';

import { logger } from '../../platform/server/log';
import * as encryption from '../encryption';
import { SyncError } from '../errors';
import * as prefs from '../prefs';

import { type Message } from './index';

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
  const requestPb = new SyncProtoBuf.SyncRequest();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const envelopePb = new SyncProtoBuf.MessageEnvelope();
    envelopePb.setTimestamp(msg.timestamp.toString());

    const messagePb = new SyncProtoBuf.Message();
    messagePb.setDataset(msg.dataset);
    messagePb.setRow(msg.row);
    messagePb.setColumn(msg.column);
    messagePb.setValue(msg.value as string);
    const binaryMsg = messagePb.serializeBinary();

    if (encryptKeyId) {
      const encrypted = new SyncProtoBuf.EncryptedData();

      let result;
      try {
        result = await encryption.encrypt(binaryMsg, encryptKeyId);
      } catch (e) {
        throw new SyncError('encrypt-failure', {
          isMissingKey: e.message === 'missing-key',
        });
      }

      encrypted.setData(result.value);
      encrypted.setIv(Buffer.from(result.meta.iv, 'base64'));
      encrypted.setAuthtag(Buffer.from(result.meta.authTag, 'base64'));

      envelopePb.setContent(encrypted.serializeBinary());
      envelopePb.setIsencrypted(true);
    } else {
      envelopePb.setContent(binaryMsg);
    }

    requestPb.addMessages(envelopePb);
  }

  requestPb.setGroupid(groupId);
  requestPb.setFileid(fileId);
  requestPb.setKeyid(encryptKeyId);
  requestPb.setSince(since.toString());

  return requestPb.serializeBinary();
}

export async function decode(
  data: Uint8Array,
): Promise<{ messages: Message[]; merkle: { hash: number } }> {
  const { encryptKeyId } = prefs.getPrefs();

  const responsePb = SyncProtoBuf.SyncResponse.deserializeBinary(data);
  const merkle = JSON.parse(responsePb.getMerkle());
  const list = responsePb.getMessagesList();
  const messages = [];

  for (let i = 0; i < list.length; i++) {
    const envelopePb = list[i];
    const timestamp = Timestamp.parse(envelopePb.getTimestamp());
    const encrypted = envelopePb.getIsencrypted();
    let msg;

    if (encrypted) {
      const binary = SyncProtoBuf.EncryptedData.deserializeBinary(
        envelopePb.getContent() as Uint8Array,
      );

      let decrypted;
      try {
        decrypted = await encryption.decrypt(coerceBuffer(binary.getData()), {
          keyId: encryptKeyId,
          algorithm: 'aes-256-gcm',
          iv: coerceBuffer(binary.getIv()),
          authTag: coerceBuffer(binary.getAuthtag()),
        });
      } catch (e) {
        logger.log(e);
        throw new SyncError('decrypt-failure', {
          isMissingKey: e.message === 'missing-key',
        });
      }

      msg = SyncProtoBuf.Message.deserializeBinary(decrypted);
    } else {
      msg = SyncProtoBuf.Message.deserializeBinary(
        envelopePb.getContent() as Uint8Array,
      );
    }

    messages.push({
      timestamp,
      dataset: msg.getDataset(),
      row: msg.getRow(),
      column: msg.getColumn(),
      value: msg.getValue(),
    });
  }

  return { messages, merkle };
}
