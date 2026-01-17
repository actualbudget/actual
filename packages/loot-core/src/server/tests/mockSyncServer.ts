// @ts-strict-ignore
import {
  makeClock,
  merkle,
  SyncProtoBuf,
  Timestamp,
  type Clock,
} from '@actual-app/crdt';

import { type Message } from '../sync';

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
  const requestPb = SyncProtoBuf.SyncRequest.deserializeBinary(data);
  const since = requestPb.getSince();
  const messages = requestPb.getMessagesList();

  const newMessages = currentMessages.filter(msg => msg.timestamp > since);

  messages.forEach(msg => {
    if (!currentMessages.find(m => m.timestamp === msg.getTimestamp())) {
      currentMessages.push({
        timestamp: msg.getTimestamp(),
        is_encrypted: msg.getIsencrypted(),
        content: msg.getContent_asU8(),
      });

      currentClock.merkle = merkle.insert(
        currentClock.merkle,
        Timestamp.parse(msg.getTimestamp()),
      );
    }
  });

  currentClock.merkle = merkle.prune(currentClock.merkle);

  const responsePb = new SyncProtoBuf.SyncResponse();
  responsePb.setMerkle(JSON.stringify(currentClock.merkle));

  newMessages.forEach(msg => {
    const envelopePb = new SyncProtoBuf.MessageEnvelope();
    envelopePb.setTimestamp(msg.timestamp);
    envelopePb.setIsencrypted(msg.is_encrypted);
    envelopePb.setContent(msg.content);
    responsePb.addMessages(envelopePb);
  });

  return responsePb.serializeBinary();
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
    const fields = SyncProtoBuf.Message.deserializeBinary(content);

    return {
      timestamp: Timestamp.parse(timestamp),
      dataset: fields.getDataset(),
      row: fields.getRow(),
      column: fields.getColumn(),
      value: deserializeValue(fields.getValue()),
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
