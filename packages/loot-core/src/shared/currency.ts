import { ISO4217 } from './currencies/iso4217';
import { crypto } from './currencies/crypto';

type CurrencyListType = 'iso4217' | 'crypto';

type Currency = {
  code: string;
  name: string;
  number?: number;
  minorUnits: number;
  symbol?: string;
  countries?: Array<string>;
}

const defaultCurrency: Currency = {
  code: 'UNK',
  name: 'Unknown Currency',
  minorUnits: 2,
  symbol: "$",
};

export function getCurrencyList(
  list?: CurrencyListType | Array<CurrencyListType>
): object {
  if (list == null) list = ['iso4217', 'crypto'];
  if (typeof list == 'string') list = [list];
  var currencyList = {};
  list.forEach(item => {
    currencyList = {
      ...currencyList,
      ...(item === 'iso4217' && ISO4217),
      ...(item === 'crypto' && crypto),
    }
  });
  return currencyList;
}

export function getCurrency(code?: string): Currency {
  const currencies = getCurrencyList();
  if (code) code = code.toUpperCase();
  if (!Object.hasOwn(currencies, code)) return defaultCurrency;
  return { code, ...currencies[code] };
}
