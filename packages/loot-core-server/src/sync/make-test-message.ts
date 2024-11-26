// @ts-strict-ignore
import { SyncProtoBuf } from '@actual-app/crdt';

import * as encryption from '../encryption';

async function randomString() {
  return (await encryption.randomBytes(12)).toString();
}

export async function makeTestMessage(keyId) {
  const messagePb = new SyncProtoBuf.Message();
  messagePb.setDataset(await randomString());
  messagePb.setRow(await randomString());
  messagePb.setColumn(await randomString());
  messagePb.setValue(await randomString());
  const binaryMsg = messagePb.serializeBinary();

  return await encryption.encrypt(binaryMsg, keyId);
}
