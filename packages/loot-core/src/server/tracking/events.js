import asyncStorage from '../../platform/server/asyncStorage';
import { sha256String } from '../encryption-internals';
let Mixpanel = require('@jlongster/mixpanel');
let uuid = require('../../platform/uuid');

let currentUniqueId;
let mixpanel;
let isEnabled = true;

export function toggle(trackUsage) {
  isEnabled = trackUsage == null || trackUsage === 'true' ? true : false;
}

// TODO: Figure out location, send to EU data centers if in EU
// {
//     host: "api-eu.mixpanel.com",
// },

// This must stay up-to-date with all apps that hit mixpanel! That includes the
// website and server. If changing this, make sure to change it everywhere
async function hash(userId) {
  let hashed = await sha256String(userId);
  return `user-${hashed.replace(/[=/]/g, '')}`;
}

function isAnonymous(id) {
  return !id.startsWith('user-');
}

export async function init() {
  mixpanel = Mixpanel.init('7e6461b8dde1d5dbf04ed1711768257a');

  let [
    [, distinctId],
    [, userId],
    [, trackUsage]
  ] = await asyncStorage.multiGet(['distinct-id-v2', 'user-id', 'track-usage']);

  toggle(trackUsage);

  if (distinctId == null) {
    if (userId) {
      let hashedId = await hash(userId);
      currentUniqueId = hashedId;
      setProfile({ $name: hashedId });
    } else {
      currentUniqueId = uuid.v4Sync();
    }

    await asyncStorage.setItem('distinct-id-v2', currentUniqueId);
  } else {
    currentUniqueId = distinctId;

    if (!isAnonymous(distinctId)) {
      setProfile({ $name: distinctId });
    }
  }
}

export async function login(userId) {
  let hashedId = await hash(userId);
  await asyncStorage.setItem('distinct-id-v2', hashedId);

  if (isAnonymous(currentUniqueId)) {
    mixpanel.identify(hashedId, currentUniqueId);

    startBuffering();
    // So ridiculous. https://help.mixpanel.com/hc/en-us/articles/115004497803-Identity-Management-Best-Practices#serverside-aliasing
    setTimeout(() => {
      stopBuffering();
    }, 2000);

    currentUniqueId = hashedId;
    setProfile({ $name: hashedId });
  } else {
    currentUniqueId = hashedId;
  }
}

let BUFFERING = false;
let BUFFER = [];

function startBuffering() {
  BUFFERING = true;
  BUFFER = [];
}

function stopBuffering() {
  for (let call of BUFFER) {
    call[0](...call[1]);
  }
  BUFFERING = false;
  BUFFER = [];
}

function buffered(func) {
  return (...args) => {
    if (process.env.NODE_ENV !== 'development') {
      if (BUFFERING) {
        BUFFER.push([func, [currentUniqueId, ...args]]);
      } else {
        func(currentUniqueId, ...args);
      }
    }
  };
}

export const track = buffered((distinct_id, name, props) => {});

export const setProfile = buffered((distinct_id, props) => {});
