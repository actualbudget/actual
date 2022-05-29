let { sequential } = require('./util/async');

let actual = require('@actual-app/api');
let SyncPb = actual.internal.SyncProtoBuf;

// This method must be sequential (TODO: document why, because Actual
// is global etc)
const sync = sequential(async function syncAPI(messages, since, fileId) {
  let prefs = await actual.internal.send('load-prefs');
  if (prefs == null || prefs.id !== fileId) {
    if (prefs != null) {
      await actual.internal.send('close-budget');
    }

    await actual.internal.send('load-budget', { id: fileId });
  }

  messages = messages.map(envPb => {
    let timestamp = envPb.getTimestamp();
    let msg = SyncPb.Message.deserializeBinary(envPb.getContent());
    return {
      timestamp: timestamp,
      dataset: msg.getDataset(),
      row: msg.getRow(),
      column: msg.getColumn(),
      value: msg.getValue()
    };
  });

  let newMessages = await actual.internal.syncAndReceiveMessages(messages, since);

  return {
    trie: actual.internal.timestamp.getClock().merkle,
    newMessages: newMessages
  };
});

module.exports = { sync };
