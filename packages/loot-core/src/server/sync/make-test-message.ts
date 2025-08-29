// @ts-strict-ignore
import { createMessage, MessageSchema, toBinary } from '@actual-app/crdt';

import * as encryption from '../encryption';

async function randomString() {
  return (await encryption.randomBytes(12)).toString();
}

export async function makeTestMessage(keyId) {
  const messagePb = createMessage(MessageSchema);
  messagePb.dataset = await randomString();
  messagePb.row = await randomString();
  messagePb.column = await randomString();
  messagePb.value = await randomString();
  const binaryMsg = toBinary(MessageSchema, messagePb);

  return await encryption.encrypt(binaryMsg, keyId);
}
