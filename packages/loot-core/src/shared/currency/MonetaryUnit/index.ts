import { Currency, getCurrency } from "..";

const fixedMinorUnits = 18n;

const MAX_SAFE_NUMBER = 2 ** 52 - 1;
const MIN_SAFE_NUMBER = -MAX_SAFE_NUMBER;

export type MonetaryUnitDisplayFormat = {
  locale?: string;
  hideFraction?: boolean;
  showSymbol?: boolean;
  postSymbol?: boolean;
  showCurrencyCode?: boolean;
};

export function MonetaryUnit(
  amount: number | bigint, // | string,
  currency?: string | Currency,
) {
  const _currency = currency
    ? typeof currency === 'string'
      ? getCurrency(currency)
      : currency
    : getCurrency();

  const _amount: bigint = typeof amount === 'bigint'
    ? amount
    : typeof amount === 'string'
      ? stringToBigInt(amount)
      : floatToBigInt(amount);

  function valueOf(): bigint {
    return _amount;
  }

  function toString(format?: MonetaryUnitDisplayFormat): string {
    const formatter = new Intl.NumberFormat(
      format?.locale,
      {
        ...(format?.showSymbol && {
          style: 'currency',
          currency: _currency.code,  
        }),
        minimumFractionDigits: format?.hideFraction ? 0 : _currency.minorUnits,
        maximumFractionDigits: format?.hideFraction ? 0 : _currency.minorUnits,
      }
    );

    var formatted = (format?.showCurrencyCode ? _currency.code + ' ' : '') + formatter.format(bigIntToFloat(_amount));

    return formatted;
  }

  function convertTo(currency: string | Currency, exchangeRate: number) {
    const sigfig = getSigFig(exchangeRate);
    const fxRate = BigInt(Math.floor(exchangeRate * 10**sigfig));
    var newAmount = _amount * fxRate / (10n**BigInt(sigfig));
    console.log(newAmount);
    return MonetaryUnit(newAmount, currency);
  }

  function getExchangeRate(value: typeof MonetaryUnit): number {
    console.log(value);
    return -1;
  }

  return {
    toString,
    valueOf,
    currency: _currency,
    convertTo,
    getExchangeRate,
  };
};

function stringToBigInt(n: string): bigint {
  const float = n.split(/[.,]/);
  const full = BigInt(float[0]) * 10n**fixedMinorUnits;
  const fractional = float.length > 1
    ? BigInt(float[1]) * 10n**(fixedMinorUnits - BigInt(float[1].length))
    : 0n;
  return full + fractional;
}

function floatToBigInt(n: number): bigint {
  return stringToBigInt('' + n);
}

function integerToBigInt(n: number): bigint {
  return stringToBigInt('' + n);
}

function bigIntToFloat (n: bigint): number {
  const sn = n.toString();
  const index = sn.length - Number(fixedMinorUnits);
  const sFloat = sn.substring(0, index) + '.' + sn.substring(index);
  return Number(sFloat);
}

function getSigFig(n: number | string): number {
  const float = (''+n).split(/[.,]/);
  return float.length > 1 ? float[1].length : 0;
}