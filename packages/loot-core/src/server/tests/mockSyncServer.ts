import {
  Clock,
  makeClock,
  Timestamp,
  merkle,
  SyncProtoBuf,
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
  let requestPb = SyncProtoBuf.SyncRequest.deserializeBinary(data);
  let since = requestPb.getSince();
  let messages = requestPb.getMessagesList();

  let newMessages = currentMessages.filter(msg => msg.timestamp > since);

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

  let responsePb = new SyncProtoBuf.SyncResponse();
  responsePb.setMerkle(JSON.stringify(currentClock.merkle));

  newMessages.forEach(msg => {
    let envelopePb = new SyncProtoBuf.MessageEnvelope();
    envelopePb.setTimestamp(msg.timestamp);
    envelopePb.setIsencrypted(msg.is_encrypted);
    envelopePb.setContent(msg.content);
    responsePb.addMessages(envelopePb);
  });

  return responsePb.serializeBinary();
};

handlers['/plaid/handoff_public_token'] = () => {
  // Do nothing
};

handlers['/plaid/accounts'] = ({ client_id, group_id, item_id }) => {
  // Ignore the parameters and just return the accounts.
  return { accounts: currentMockData.accounts };
};

handlers['/plaid/transactions'] = ({
  account_id,
  start_date,
  end_date,
  count,
  offset,
}) => {
  const accounts = currentMockData.accounts;
  const transactions = currentMockData.transactions[account_id].filter(
    t => t.date >= start_date && t.date <= end_date,
  );

  return {
    accounts: accounts.filter(acct => acct.account_id === account_id),
    transactions: transactions.slice(offset, offset + count),
    total_transactions: transactions.length,
  };
};

export const filterMockData = func => {
  let copied = JSON.parse(JSON.stringify(defaultMockData));
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
    let { timestamp, content } = msg;
    let fields = SyncProtoBuf.Message.deserializeBinary(content);

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
