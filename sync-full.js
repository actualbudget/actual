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

  const newMessages = await actual.internal.syncAndReceiveMessages(messages, since);

  return {
    trie: actual.internal.timestamp.getClock().merkle,
    newMessages: newMessages.map(msg => {
      const envelopePb = new SyncPb.MessageEnvelope();

      const messagePb = new SyncPb.Message();
      messagePb.setDataset(msg.dataset);
      messagePb.setRow(msg.row);
      messagePb.setColumn(msg.column);
      messagePb.setValue(msg.value);
      envelopePb.setTimestamp(msg.timestamp);

      envelopePb.setContent(messagePb.serializeBinary());
      return envelopePb;
    })
  };
});

module.exports = { sync };
