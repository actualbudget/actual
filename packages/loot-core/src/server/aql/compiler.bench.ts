import { bench, describe } from 'vitest';

import { q } from '#shared/query';

import { generateSQLWithState } from './compiler';

const schema = {
  transactions: {
    id: { type: 'id' },
    date: { type: 'date' },
    amount: { type: 'integer' },
    notes: { type: 'string' },
    cleared: { type: 'boolean' },
    payee: { type: 'id', ref: 'payees' },
    category: { type: 'id', ref: 'categories' },
    account: { type: 'id', ref: 'accounts' },
    tombstone: { type: 'boolean' },
  },
  payees: {
    id: { type: 'id' },
    name: { type: 'string' },
    tombstone: { type: 'boolean' },
  },
  categories: {
    id: { type: 'id' },
    name: { type: 'string' },
    is_income: { type: 'boolean' },
    tombstone: { type: 'boolean' },
  },
  accounts: {
    id: { type: 'id' },
    name: { type: 'string' },
    offbudget: { type: 'boolean' },
    tombstone: { type: 'boolean' },
  },
};

const simpleQuery = q('transactions')
  .filter({ account: 'abc' })
  .select(['date', 'amount', 'notes'])
  .serialize();

const complexQuery = q('transactions')
  .filter({
    $and: [
      { 'account.offbudget': false },
      { date: { $gte: '2023-01-01' } },
      { date: { $lte: '2023-12-31' } },
      {
        $or: [
          { 'category.is_income': true },
          { amount: { $lt: 0 } },
          { 'payee.name': { $like: '%market%' } },
        ],
      },
    ],
  })
  .select([
    'date',
    'amount',
    'notes',
    'payee.name',
    'category.name',
    'account.name',
  ])
  .orderBy([{ date: 'desc' }, 'amount'])
  .serialize();

const groupedQuery = q('transactions')
  .filter({ 'account.offbudget': false })
  .groupBy(['category.name'])
  .select(['category.name', { total: { $sum: '$amount' } }])
  .serialize();

describe('aql compiler', () => {
  bench('compile simple query', () => {
    generateSQLWithState(simpleQuery, schema);
  });

  bench('compile complex filtered/joined query', () => {
    generateSQLWithState(complexQuery, schema);
  });

  bench('compile grouped aggregate query', () => {
    generateSQLWithState(groupedQuery, schema);
  });
});
