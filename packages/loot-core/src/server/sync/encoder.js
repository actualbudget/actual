import encryption from '../encryption';
import * as prefs from '../prefs';

let { SyncError } = require('../errors');

let SyncPb = require('./proto/sync_pb');

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

export async function encode(groupId, fileId, since, messages) {
  let { encryptKeyId } = prefs.getPrefs();
  let requestPb = new SyncPb.SyncRequest();

  for (let i = 0; i < messages.length; i++) {
    let msg = messages[i];
    let envelopePb = new SyncPb.MessageEnvelope();
    envelopePb.setTimestamp(msg.timestamp);

    let messagePb = new SyncPb.Message();
    messagePb.setDataset(msg.dataset);
    messagePb.setRow(msg.row);
    messagePb.setColumn(msg.column);
    messagePb.setValue(msg.value);
    let binaryMsg = messagePb.serializeBinary();

    if (encryptKeyId) {
      let encrypted = new SyncPb.EncryptedData();

      let result;
      try {
        result = await encryption.encrypt(binaryMsg, encryptKeyId);
      } catch (e) {
        throw new SyncError('encrypt-failure', {
          isMissingKey: e.message === 'missing-key'
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
  requestPb.setSince(since);

  return requestPb.serializeBinary();
}

export async function decode(data) {
  let { encryptKeyId } = prefs.getPrefs();

  let responsePb = SyncPb.SyncResponse.deserializeBinary(data);
  let merkle = JSON.parse(responsePb.getMerkle());
  let list = responsePb.getMessagesList();
  let messages = [];

  for (let i = 0; i < list.length; i++) {
    let envelopePb = list[i];
    let timestamp = envelopePb.getTimestamp();
    let encrypted = envelopePb.getIsencrypted();
    let msg;

    if (encrypted) {
      let binary = SyncPb.EncryptedData.deserializeBinary(
        envelopePb.getContent()
      );

      let decrypted;
      try {
        decrypted = await encryption.decrypt(coerceBuffer(binary.getData()), {
          keyId: encryptKeyId,
          algorithm: 'aes-256-gcm',
          iv: coerceBuffer(binary.getIv()),
          authTag: coerceBuffer(binary.getAuthtag())
        });
      } catch (e) {
        console.log(e);
        throw new SyncError('decrypt-failure', {
          isMissingKey: e.message === 'missing-key'
        });
      }

      msg = SyncPb.Message.deserializeBinary(decrypted);
    } else {
      msg = SyncPb.Message.deserializeBinary(envelopePb.getContent());
    }

    messages.push({
      timestamp: timestamp,
      dataset: msg.getDataset(),
      row: msg.getRow(),
      column: msg.getColumn(),
      value: msg.getValue()
    });
  }

  return { messages, merkle };
}
