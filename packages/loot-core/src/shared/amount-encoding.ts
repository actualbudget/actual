import { currencies, getDecimalPlaces } from './currencies';

export type AmountEncoding = {
  version: 1;
  currencyCode: string;
  precision: number;
};

export function parseAmountEncoding(
  value: string | undefined,
): AmountEncoding | null {
  if (!value) return null;
  const parsed: AmountEncoding = JSON.parse(value);
  if (
    !parsed ||
    parsed.version !== 1 ||
    typeof parsed.currencyCode !== 'string' ||
    !/^(?:[A-Z]{3})?$/.test(parsed.currencyCode) ||
    !Number.isInteger(parsed.precision) ||
    parsed.precision < 0 ||
    parsed.precision > 15
  ) {
    throw new Error('amount-encoding-unsupported');
  }
  return parsed;
}

export function reviewedAmountEncoding(currencyCode: string): AmountEncoding {
  if (currencyCode === '') {
    return { version: 1, currencyCode: '', precision: 2 };
  }
  if (
    !currencies.some(
      currency => currency.code !== '' && currency.code === currencyCode,
    )
  ) {
    throw new Error('amount-encoding-unreviewed-currency');
  }
  return {
    version: 1,
    currencyCode,
    precision: getDecimalPlaces(currencyCode),
  };
}

export function isReviewedCurrency(currencyCode: string): boolean {
  return currencies.some(
    currency => currency.code !== '' && currency.code === currencyCode,
  );
}

/** Imported budgets keep only reviewed source currencies; others stay legacy 2dp. */
export function importedCurrencyCode(currencyCode: string): string {
  return currencyCode &&
    currencies.some(
      currency => currency.code !== '' && currency.code === currencyCode,
    )
    ? currencyCode
    : '';
}
