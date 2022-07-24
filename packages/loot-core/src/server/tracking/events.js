import asyncStorage from '../../platform/server/asyncStorage';
import { sha256String } from '../encryption-internals';
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

export async function init() {}

export async function login(userId) {}

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
