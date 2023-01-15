import { compile } from './new/compiler';

const sqlinterp = require('./sqlinterp');

test('sql interpretation works', async () => {
  const transJan = {
    date: 20170106,
    amount: -5000,
    acct: 'boa',
    category: 1
  };
  const transFeb = {
    date: 20170215,
    amount: -7620,
    acct: 'boa',
    category: 1
  };

  const { sqlDependencies } = compile(`
    =from transactions
       where date >= 20170101 and date <= 20170131 and
         category = 1
       select { amount }
  `);
  const where = sqlDependencies[0].where;

  expect(sqlinterp(where, transJan, 'transactions')).toBe(true);
  expect(sqlinterp(where, transFeb, 'transactions')).toBe(false);
});
