// @ts-strict-ignore
import { create, MessageSchema, toBinary } from '@actual-app/crdt';

import * as encryption from '#server/encryption';

function randomString() {
  return encryption.randomBytes(12).toString();
}

export async function makeTestMessage(keyId) {
  const binaryMsg = toBinary(
    MessageSchema,
    create(MessageSchema, {
      dataset: randomString(),
      row: randomString(),
      column: randomString(),
      value: randomString(),
    }),
  );

  return await encryption.encrypt(binaryMsg, keyId);
}
