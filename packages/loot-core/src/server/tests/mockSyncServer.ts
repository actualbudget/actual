// @ts-strict-ignore
import {
  Clock,
  makeClock,
  Timestamp,
  merkle,
  createMessage,
  SyncResponseSchema,
  MessageEnvelopeSchema,
  toBinary,
  fromBinary,
  MessageSchema,
  SyncRequestSchema,
} from '@actual-app/crdt';

import { Message } from '../sync';

import { basic as defaultMockData } from './mockData.json';

const handlers = {};
let currentMockData = defaultMockData;
let currentClock = makeClock(new Timestamp(0, 0, '0000000000000000'));
let currentMessages: {
  timestamp: string;
  is_encrypted: boolean;
  content: Uint8Array;
}[] = [];

// Ugh, this is duplicated...
function deserializeValue(value) {
  const type = value[0];
  switch (type) {
    case '0':
      return null;
    case 'N':
      return parseFloat(value.slice(2));
    case 'S':
      return value.slice(2);
    default:
  }

  throw new Error('Invalid type key for value: ' + value);
}

handlers['/'] = () => {
  return 'development';
};

handlers['/sync/sync'] = async (data: Uint8Array): Promise<Uint8Array> => {
  const requestPb = fromBinary(SyncRequestSchema, data);
  const since = requestPb.since;
  const messages = requestPb.messages;

  const newMessages = currentMessages.filter(msg => msg.timestamp > since);

  messages.forEach(msg => {
    if (!currentMessages.find(m => m.timestamp === msg.timestamp)) {
      currentMessages.push({
        timestamp: msg.timestamp,
        is_encrypted: msg.isEncrypted,
        content: msg.content,
      });

      currentClock.merkle = merkle.insert(
        currentClock.merkle,
        Timestamp.parse(msg.timestamp),
      );
    }
  });

  currentClock.merkle = merkle.prune(currentClock.merkle);

  const responsePb = createMessage(SyncResponseSchema);
  responsePb.merkle = JSON.stringify(currentClock.merkle);

  newMessages.forEach(msg => {
    const envelopePb = createMessage(MessageEnvelopeSchema);
    envelopePb.timestamp = msg.timestamp;
    envelopePb.isEncrypted = msg.is_encrypted;
    envelopePb.content = msg.content;
    responsePb.messages.push(envelopePb);
  });

  return toBinary(SyncResponseSchema, responsePb);
};

handlers['/gocardless/accounts'] = () => {
  // Ignore the parameters and just return the accounts.
  return { accounts: currentMockData.accounts };
};

export const filterMockData = func => {
  const copied = JSON.parse(JSON.stringify(defaultMockData));
  currentMockData = func(copied);
};

export const reset = () => {
  currentMockData = defaultMockData;
  currentClock = makeClock(new Timestamp(0, 0, '0000000000000000'));
  currentMessages = [];
};

export const getClock = (): Clock => {
  return currentClock;
};

export const getMessages = (): Message[] => {
  return currentMessages.map(msg => {
    const { timestamp, content } = msg;
    const fields = fromBinary(MessageSchema, content);

    return {
      timestamp: Timestamp.parse(timestamp),
      dataset: fields.dataset,
      row: fields.row,
      column: fields.column,
      value: deserializeValue(fields.value),
    };
  });
};

export const handleRequest = (url, data) => {
  url = url.replace(/http(s)?:\/\/[^/]*/, '');
  if (!handlers[url]) {
    throw new Error('No url handler for ' + url);
  }
  return Promise.resolve(handlers[url](data));
};

export { handlers, handleRequest as handleRequestBinary };
