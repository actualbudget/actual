// @ts-strict-ignore
import { SyncProtoBuf } from '@actual-app/crdt';

import * as encryption from '../encryption';

function randomString() {
  return encryption.randomBytes(12).toString();
}

export async function makeTestMessage(keyId) {
  const messagePb = new SyncProtoBuf.Message();
  messagePb.setDataset(randomString());
  messagePb.setRow(randomString());
  messagePb.setColumn(randomString());
  messagePb.setValue(randomString());
  const binaryMsg = messagePb.serializeBinary();

  return await encryption.encrypt(binaryMsg, keyId);
}
