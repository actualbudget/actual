import { SyncProtoBuf } from '@actual-app/crdt';

import * as encryption from '../encryption';

async function randomString() {
  return (await encryption.randomBytes(12)).toString();
}

export default async function makeTestMessage(keyId) {
  let messagePb = new SyncProtoBuf.Message();
  messagePb.setDataset(await randomString());
  messagePb.setRow(await randomString());
  messagePb.setColumn(await randomString());
  messagePb.setValue(await randomString());
  let binaryMsg = messagePb.serializeBinary();

  return await encryption.encrypt(binaryMsg, keyId);
}
