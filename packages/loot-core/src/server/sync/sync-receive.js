import { runMutator } from '../mutators';
import Timestamp from '../timestamp';
import { applyMessages } from "./sync-apply";
import { deserializeValue, getMessagesSince } from "./utils"

export function receiveMessages(messages) {
  messages.forEach(msg => {
    Timestamp.recv(msg.timestamp);
  });

  return runMutator(() => applyMessages(messages));
}

export async function syncAndReceiveMessages(messages, since) {
  let localMessages = await getMessagesSince(since);
  await receiveMessages(
    messages.map(msg => ({
      ...msg,
      value: deserializeValue(msg.value),
      timestamp: Timestamp.parse(msg.timestamp)
    }))
  );
  return localMessages;
}
