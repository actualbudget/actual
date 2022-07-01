import app from '../main-app';
import { applyMessages } from "./sync-apply";
import { scheduleFullSync } from "./full"

const { SyncError } = require('../errors');

async function _sendMessages(messages) {
  try {
    await applyMessages(messages);
  } catch (e) {
    if (e instanceof SyncError) {
      if (e.reason === 'invalid-schema') {
        // We know this message came from a local modification, and it
        // couldn't apply, which doesn't make any sense. Must be a bug
        // in the code. Send a specific error type for it for a custom
        // message.
        app.events.emit('sync', {
          type: 'error',
          subtype: 'apply-failure'
        });
      } else {
        app.events.emit('sync', { type: 'error' });
      }
    }

    throw e;
  }

  await scheduleFullSync();
}

let IS_BATCHING = false;
let _BATCHED = [];
export async function batchMessages(func) {
  if (IS_BATCHING) {
    await func();
    return;
  }

  IS_BATCHING = true;
  let batched = [];

  try {
    await func();
    // TODO: if it fails, it shouldn't apply them?
  } finally {
    IS_BATCHING = false;
    batched = _BATCHED;
    _BATCHED = [];
  }

  if (batched.length > 0) {
    await _sendMessages(batched);
  }
}

export async function sendMessages(messages) {
  if (IS_BATCHING) {
    _BATCHED = _BATCHED.concat(messages);
  } else {
    return _sendMessages(messages);
  }
}
