import encryption from '../encryption';

let SyncPb = require('./proto/sync_pb');

async function randomString() {
  return (await encryption.randomBytes(12)).toString();
}

export default async function makeTestMessage(keyId) {
  let messagePb = new SyncPb.Message();
  messagePb.setDataset(await randomString());
  messagePb.setRow(await randomString());
  messagePb.setColumn(await randomString());
  messagePb.setValue(await randomString());
  let binaryMsg = messagePb.serializeBinary();

  return await encryption.encrypt(binaryMsg, keyId);
}
