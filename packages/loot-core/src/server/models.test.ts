import { accountModel, exchangeRateModel } from './models';

describe('accountModel', () => {
  it.each([null, undefined, 'USD', 'CAD', 'COP', 'JPY', 'KRW'])(
    'accepts giving an account %s',
    currency => {
      expect(() => accountModel.validateCurrency(currency)).not.toThrow();
    },
  );

  it.each(['', 'XYZ'])('refuses the unsupported currency "%s"', currency => {
    expect(() => accountModel.validateCurrency(currency)).toThrow(
      /unsupported currency/,
    );
  });

  it('keeps accepting a currency accounts already have', () => {
    expect(() =>
      accountModel.validate({ name: 'Yen', currency: 'JPY' }),
    ).not.toThrow();
  });

  it.each(['', 'XYZ'])('never stores the unsupported currency "%s"', code => {
    expect(() =>
      accountModel.validate({ name: 'Bad', currency: code }),
    ).toThrow(/unsupported currency/);
  });
});

describe('exchangeRateModel', () => {
  const usdToCad = {
    from_currency: 'USD',
    to_currency: 'CAD',
    rate: 1.38,
    date: '2026-10-01',
  };

  it.each([1e-9, 0.000333333, 1.38, 3000, 1e9])(
    'accepts a rate of %d',
    rate => {
      expect(exchangeRateModel.validate({ ...usdToCad, rate })).toMatchObject({
        rate,
      });
    },
  );

  it.each([0, -1, 1e-10, 1e-320, 1e9 + 1, 1e15, NaN, Infinity, '1.38'])(
    'rejects a rate of %s',
    rate => {
      expect(() =>
        exchangeRateModel.validate({
          ...usdToCad,
          rate: rate as number,
        }),
      ).toThrow(
        /exchangeRate must have a positive rate between 0.000000001 and 1000000000/,
      );
    },
  );

  it('accepts rates for currencies accounts cannot be given', () => {
    expect(() =>
      exchangeRateModel.validate({ ...usdToCad, to_currency: 'JPY' }),
    ).not.toThrow();
  });
});
