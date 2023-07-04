import { Timestamp, SyncProtoBuf } from '@actual-app/crdt';

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
  since: Timestamp,
  messages: Message[],
): Promise<Uint8Array> {
  let { encryptKeyId } = prefs.getPrefs();
  let requestPb = new SyncProtoBuf.SyncRequest();

  for (let i = 0; i < messages.length; i++) {
    let msg = messages[i];
    let envelopePb = new SyncProtoBuf.MessageEnvelope();
    envelopePb.setTimestamp(msg.timestamp.toString());

    let messagePb = new SyncProtoBuf.Message();
    messagePb.setDataset(msg.dataset);
    messagePb.setRow(msg.row);
    messagePb.setColumn(msg.column);
    messagePb.setValue(msg.value as string);
    let binaryMsg = messagePb.serializeBinary();

    if (encryptKeyId) {
      let encrypted = new SyncProtoBuf.EncryptedData();

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
  let { encryptKeyId } = prefs.getPrefs();

  let responsePb = SyncProtoBuf.SyncResponse.deserializeBinary(data);
  let merkle = JSON.parse(responsePb.getMerkle());
  let list = responsePb.getMessagesList();
  let messages = [];

  for (let i = 0; i < list.length; i++) {
    let envelopePb = list[i];
    let timestamp = Timestamp.parse(envelopePb.getTimestamp());
    let encrypted = envelopePb.getIsencrypted();
    let msg;

    if (encrypted) {
      let binary = SyncProtoBuf.EncryptedData.deserializeBinary(
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
        console.log(e);
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
      timestamp: timestamp,
      dataset: msg.getDataset(),
      row: msg.getRow(),
      column: msg.getColumn(),
      value: msg.getValue(),
    });
  }

  return { messages, merkle };
}
