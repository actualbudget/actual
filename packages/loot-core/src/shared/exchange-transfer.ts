import { roundEven } from './amount-rescale';
import { baseToNative } from './exchange-rate';

export type ExchangeInput = {
  /** Total source debit S, a positive integer in the source encoding. */
  sourceAmount: number;
  sourcePrecision: number;
  destinationPrecision: number;
  /** At most one fee is nonzero; each is in its own endpoint's encoding. */
  sourceFee?: number;
  destinationFee?: number;
} & (
  | { destinationAmount: number; rate?: undefined }
  | { rate: string; destinationAmount?: undefined }
);

export type ExchangeLegs = {
  /** P = S - F_source, debited by the source transfer leg. */
  principal: number;
  /** G, credited by the destination transfer leg. */
  gross: number;
  /** N = G - F_destination, the destination account's net credit. */
  net: number;
  sourceFee: number;
  destinationFee: number;
};

function positive(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('exchange-amount-invalid');
  }
  return value;
}

function fee(value: number | undefined) {
  if (value === undefined) return 0;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error('exchange-fee-invalid');
  }
  return value;
}

/**
 * The stored integers of an exchange: S and either the net credit N or a
 * rate R (destination major units per source major unit). Totals come from
 * these integers, never from reversing a rounded rate.
 */
export function exchangeLegs(input: ExchangeInput): ExchangeLegs {
  const sourceAmount = positive(input.sourceAmount);
  const sourceFee = fee(input.sourceFee);
  const destinationFee = fee(input.destinationFee);
  if (sourceFee > 0 && destinationFee > 0) {
    throw new Error('exchange-fee-invalid');
  }
  const principal = sourceAmount - sourceFee;
  if (principal <= 0) {
    throw new Error('exchange-fee-invalid');
  }

  let gross: number;
  if (input.rate !== undefined) {
    try {
      gross = baseToNative(
        principal,
        input.sourcePrecision,
        input.destinationPrecision,
        input.rate,
      );
    } catch (err) {
      // A converted amount beyond safe integers is an invalid exchange.
      if (err instanceof Error && err.message === 'amount-out-of-range') {
        throw new Error('exchange-amount-invalid');
      }
      throw err;
    }
  } else {
    const net = positive(input.destinationAmount);
    gross = net + destinationFee;
  }
  positive(gross);
  const net = gross - destinationFee;
  if (net <= 0) {
    throw new Error('exchange-fee-invalid');
  }
  return { principal, gross, net, sourceFee, destinationFee };
}

/**
 * A fee's base amount at the transfer's own implied rate: F × V / leg, where
 * leg is the native transfer leg (P or G) valued at V.
 */
export function feeBase(fee: number, value: number, leg: number): number {
  if (fee === 0) return 0;
  const result = Number(roundEven(BigInt(fee) * BigInt(value), BigInt(leg)));
  if (!Number.isSafeInteger(result)) {
    throw new Error('exchange-amount-invalid');
  }
  return result;
}
