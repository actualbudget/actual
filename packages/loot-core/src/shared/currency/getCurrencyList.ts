import { CurrencyListType, ISO4217, crypto } from './currencies';

export function getCurrencyList(
  list?: CurrencyListType | Array<CurrencyListType>,
): object {
  if (list == null) list = ['iso4217', 'crypto'];
  if (typeof list == 'string') list = [list];
  let currencyList = {};
  list.forEach(item => {
    currencyList = {
      ...currencyList,
      ...(item === 'iso4217' && ISO4217),
      ...(item === 'crypto' && crypto),
    };
  });
  return currencyList;
}
