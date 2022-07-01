import { once } from '../../shared/async';
import * as prefs from '../prefs';
import app from '../main-app';
import asyncStorage from '../../platform/server/asyncStorage';
import { captureException } from '../../platform/exceptions';
import logger from '../../platform/server/log';
import { postBinary } from '../post';
import * as db from '../db';
import * as sheet from '../sheet';
import { runMutator } from '../mutators';
import Timestamp, {
  deserializeClock,
  getClock
} from '../timestamp';
import * as merkle from '../merkle';
import * as encoder from './encoder';
import { getServer } from '../server-config';
import { rebuildMerkleHash } from './repair';
import { checkSyncingMode } from "./syncing-mode";
import { applyMessages, deserializeValue } from "./sync-apply";
import { getTablesFromMessages, getMessagesSince } from './utils';

const { PostError, SyncError } = require('../errors');

let FULL_SYNC_DELAY = 1000;

export function receiveMessages(messages) {
  messages.forEach(msg => {
    Timestamp.recv(msg.timestamp);
  });

  return runMutator(() => applyMessages(messages));
}

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

export function clearFullSyncTimeout() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
}

let syncTimeout = null;
export function scheduleFullSync() {
  clearFullSyncTimeout();

  if (checkSyncingMode('enabled') && !checkSyncingMode('offline')) {
    if (global.__TESTING__) {
      return fullSync().then(res => {
        if (res.error) {
          throw res.error;
        }
        return res;
      });
    } else {
      syncTimeout = setTimeout(fullSync, FULL_SYNC_DELAY);
    }
  }
}

// This is different than `fullSync` because it waits for the
// spreadsheet to finish any processing. This is useful if we want to
// perform a full sync and wait for everything to finish, usually if
// you're doing an initial sync before working with a file.
export async function initialFullSync() {
  let result = await fullSync();
  if (!result.error) {
    // Make sure to wait for anything in the spreadsheet to process
    await sheet.waitOnSpreadsheet();
  }
}

export const fullSync = once(async function() {
  app.events.emit('sync', { type: 'start' });
  let messages;

  try {
    messages = await _fullSync(null, 0, null);
  } catch (e) {
    console.log(e);

    if (e instanceof SyncError) {
      if (e.reason === 'out-of-sync') {
        captureException(e);

        app.events.emit('sync', {
          type: 'error',
          subtype: 'out-of-sync'
        });
      } else if (e.reason === 'invalid-schema') {
        app.events.emit('sync', {
          type: 'error',
          subtype: 'invalid-schema'
        });
      } else if (
        e.reason === 'decrypt-failure' ||
        e.reason === 'encrypt-failure'
      ) {
        app.events.emit('sync', {
          type: 'error',
          subtype: e.reason,
          meta: e.meta
        });
      } else if (e.reason === 'beta-version') {
        app.events.emit('sync', {
          type: 'error',
          subtype: e.reason
        });
      } else {
        app.events.emit('sync', { type: 'error' });
      }
    } else if (e instanceof PostError) {
      console.log(e);
      if (e.reason === 'unauthorized') {
        app.events.emit('sync', { type: 'unauthorized' });

        // Set the user into read-only mode
        asyncStorage.setItem('readOnly', 'true');
      } else if (e.reason === 'network-failure') {
        app.events.emit('sync', { type: 'error', subtype: 'network' });
      } else {
        app.events.emit('sync', { type: 'error', subtype: e.reason });
      }
    } else {
      captureException(e);
      // TODO: Send the message to the client and allow them to expand & view it
      app.events.emit('sync', { type: 'error' });
    }

    return { error: { message: e.message, reason: e.reason, meta: e.meta } };
  }

  let tables = getTablesFromMessages(messages);

  app.events.emit('sync', {
    type: 'success',
    tables,
    syncDisabled: checkSyncingMode('disabled')
  });
  return { messages };
});

async function _fullSync(sinceTimestamp, count, prevDiffTime) {
  let { cloudFileId, groupId, lastSyncedTimestamp } = prefs.getPrefs() || {};

  clearFullSyncTimeout();

  if (checkSyncingMode('disabled') || checkSyncingMode('offline')) {
    return [];
  }

  // Snapshot the point at which we are currently syncing
  let currentTime = getClock().timestamp.toString();

  let since =
    sinceTimestamp ||
    lastSyncedTimestamp ||
    // Default to 5 minutes ago
    new Timestamp(Date.now() - 5 * 60 * 1000, 0, '0').toString();

  let messages = getMessagesSince(since);

  let userToken = await asyncStorage.getItem('user-token');

  logger.info(
    'Syncing since',
    since,
    messages.length,
    '(attempt: ' + count + ')'
  );

  let buffer = await encoder.encode(groupId, cloudFileId, since, messages);

  // TODO: There a limit on how many messages we can send because of
  // the payload size. Right now it's at 20MB on the server. We should
  // check the worst case here and make multiple requests if it's
  // really large.
  let resBuffer = await postBinary(getServer().SYNC_SERVER + '/sync', buffer, {
    'X-ACTUAL-TOKEN': userToken
  });

  // Abort if the file is either no longer loaded, the group id has
  // changed because of a sync reset
  if (!prefs.getPrefs() || prefs.getPrefs().groupId !== groupId) {
    return [];
  }

  let res = await encoder.decode(resBuffer);

  logger.info('Got messages from server', res.messages.length);

  let localTimeChanged = getClock().timestamp.toString() !== currentTime;

  // Apply the new messages
  let receivedMessages = [];
  if (res.messages.length > 0) {
    receivedMessages = await receiveMessages(
      res.messages.map(msg => ({
        ...msg,
        value: deserializeValue(msg.value),
        timestamp: Timestamp.parse(msg.timestamp)
      }))
    );
  }

  let diffTime = merkle.diff(res.merkle, getClock().merkle);
  let result = res.messages;

  if (diffTime !== null) {
    // This is a bit wonky, but we loop until we are in sync with the
    // server. While syncing, either the client or server could change
    // out from under us, so it might take a couple passes to
    // completely sync up. This is a check that stops the loop in case
    // we are corrupted and can't sync up. We try 10 times if we keep
    // getting the same diff time, and add a upper limit of 300 no
    // matter what (just to stop this from ever being an infinite
    // loop).
    //
    // It's slightly possible for the user to add more messages while we
    // are in `receiveMessages`, but `localTimeChanged` would still be
    // false. In that case, we don't reset the counter but it should be
    // very unlikely that this happens enough to hit the loop limit.

    if ((count >= 10 && diffTime === prevDiffTime) || count >= 100) {
      logger.info('SENT -------');
      logger.info(JSON.stringify(messages));
      logger.info('RECEIVED -------');
      logger.info(JSON.stringify(res.messages));

      let rebuiltMerkle = rebuildMerkleHash();

      console.log(
        count,
        'messages:',
        messages.length,
        messages.length > 0 ? messages[0] : null,
        'res.messages:',
        res.messages.length,
        res.messages.length > 0 ? res.messages[0] : null,
        'clientId',
        getClock().timestamp.node(),
        'groupId',
        groupId,
        'diffTime:',
        diffTime,
        diffTime === prevDiffTime,
        'local clock:',
        getClock().timestamp.toString(),
        getClock().merkle.hash,
        'rebuilt hash:',
        rebuiltMerkle.numMessages,
        rebuiltMerkle.trie.hash,
        'server hash:',
        res.merkle.hash,
        'localTimeChanged:',
        localTimeChanged
      );

      if (rebuiltMerkle.trie.hash === res.merkle.hash) {
        // Rebuilding the merkle worked... but why?
        let clocks = await db.all('SELECT * FROM messages_clock');
        if (clocks.length !== 1) {
          console.log('Bad number of clocks:', clocks.length);
        }
        let hash = deserializeClock(clocks[0]).merkle.hash;
        console.log('Merkle hash in db:', hash);
      }

      throw new SyncError('out-of-sync');
    }

    receivedMessages = receivedMessages.concat(
      await _fullSync(
        new Timestamp(diffTime, 0, '0').toString(),
        // If something local changed while we were syncing, always
        // reset, token the counter. We never want to think syncing failed
        // because we tried to syncing many times and couldn't sync,
        // but it was because the user kept changing stuff in the
        // middle of syncing.
        localTimeChanged ? 0 : count + 1,
        diffTime
      )
    );
  } else {
    // All synced up, store the current time as a simple optimization
    // for the next sync
    await prefs.savePrefs({
      lastSyncedTimestamp: getClock().timestamp.toString()
    });
  }

  return receivedMessages;
}
