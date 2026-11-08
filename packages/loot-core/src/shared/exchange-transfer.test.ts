import { exchangeLegs, feeBase } from './exchange-transfer';

describe('exchangeLegs', () => {
  test('uses a received amount as given', () => {
    // $100.00 sent, ¥15,000 received.
    expect(
      exchangeLegs({
        sourceAmount: 10000,
        sourcePrecision: 2,
        destinationPrecision: 0,
        destinationAmount: 15000,
      }),
    ).toEqual({
      principal: 10000,
      gross: 15000,
      net: 15000,
      sourceFee: 0,
      destinationFee: 0,
    });
  });

  test('converts the principal at a rate with ties to even', () => {
    // ¥1,001 at 0.0065 KWD per yen is 6.5065 KWD: 6.506 at 3dp (tie, even).
    expect(
      exchangeLegs({
        sourceAmount: 1001,
        sourcePrecision: 0,
        destinationPrecision: 3,
        rate: '0.0065',
      }).gross,
    ).toBe(6506);
    // 0.5 cents rounds to the even 0.
    expect(() =>
      exchangeLegs({
        sourceAmount: 1,
        sourcePrecision: 0,
        destinationPrecision: 2,
        rate: '0.005',
      }),
    ).toThrow('exchange-amount-invalid');
  });

  test('reconstructs totals from the stored integers with a fee', () => {
    const withSourceFee = exchangeLegs({
      sourceAmount: 10300,
      sourcePrecision: 2,
      destinationPrecision: 0,
      sourceFee: 300,
      rate: '150.123',
    });
    // P = $100.00; G = bankersRound(100 × 150.123) = ¥15,012.
    expect(withSourceFee).toEqual({
      principal: 10000,
      gross: 15012,
      net: 15012,
      sourceFee: 300,
      destinationFee: 0,
    });
    expect(withSourceFee.principal + withSourceFee.sourceFee).toBe(10300);

    const withDestinationFee = exchangeLegs({
      sourceAmount: 10000,
      sourcePrecision: 2,
      destinationPrecision: 3,
      destinationFee: 250,
      destinationAmount: 30500,
    });
    expect(withDestinationFee).toMatchObject({ gross: 30750, net: 30500 });
    expect(withDestinationFee.gross - withDestinationFee.destinationFee).toBe(
      30500,
    );
  });

  test('rejects invalid amounts and fees', () => {
    const base = {
      sourcePrecision: 2,
      destinationPrecision: 0,
      destinationAmount: 100,
    };
    expect(() => exchangeLegs({ ...base, sourceAmount: 0 })).toThrow(
      'exchange-amount-invalid',
    );
    expect(() => exchangeLegs({ ...base, sourceAmount: 1.5 })).toThrow(
      'exchange-amount-invalid',
    );
    expect(() =>
      exchangeLegs({ ...base, sourceAmount: 100, destinationAmount: -1 }),
    ).toThrow('exchange-amount-invalid');
    expect(() =>
      exchangeLegs({ ...base, sourceAmount: 100, sourceFee: -1 }),
    ).toThrow('exchange-fee-invalid');
    expect(() =>
      exchangeLegs({
        ...base,
        sourceAmount: 100,
        sourceFee: 1,
        destinationFee: 1,
      }),
    ).toThrow('exchange-fee-invalid');
    expect(() =>
      exchangeLegs({ ...base, sourceAmount: 100, sourceFee: 100 }),
    ).toThrow('exchange-fee-invalid');
    expect(() =>
      exchangeLegs({
        sourceAmount: 100,
        sourcePrecision: 2,
        destinationPrecision: 0,
        rate: '1',
        destinationFee: 1,
      }),
    ).toThrow('exchange-fee-invalid');
    expect(() =>
      exchangeLegs({
        sourceAmount: 100,
        sourcePrecision: 2,
        destinationPrecision: 0,
        rate: '-1',
      }),
    ).toThrow('rate-invalid');
  });
});

describe('feeBase', () => {
  test("values a fee at the transfer's implied rate", () => {
    // ¥300 fee on a ¥15,000 leg valued at $100.00 is $2.00.
    expect(feeBase(300, 10000, 15000)).toBe(200);
    // 2.5 base units rounds to the even 2.
    expect(feeBase(1, 5, 2)).toBe(2);
    expect(feeBase(0, 10000, 15000)).toBe(0);
    // A zero valuation values the fee at zero.
    expect(feeBase(300, 0, 15000)).toBe(0);
  });
});
