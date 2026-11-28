import { accountBalance, accountDisplayBalance } from './bindings';

describe('accountDisplayBalance', () => {
  it('sums native amounts for a foreign account', () => {
    const binding = accountDisplayBalance({ id: 'jpy', currency: 'JPY' });
    expect(binding.name).toContain('nativeBalance');
    expect(JSON.stringify(binding.query.serialize())).toContain(
      '$transaction_amount',
    );
  });

  it('sums base amounts for a base-currency account', () => {
    const binding = accountDisplayBalance({ id: 'usd', currency: null });
    expect(binding.name).not.toContain('native');
    expect(JSON.stringify(binding.query.serialize())).toContain('"$amount"');
  });
});

it('keeps the existing balance binding in base units for every account', () => {
  // Monte Carlo pots and mobile running balances rely on base semantics.
  const query = JSON.stringify(accountBalance('jpy').query.serialize());
  expect(query).toContain('"$amount"');
  expect(query).not.toContain('transaction_amount');
});
