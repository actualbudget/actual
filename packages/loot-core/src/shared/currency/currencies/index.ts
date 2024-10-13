import { ISO4217 } from './iso4217';
import { crypto } from './crypto';

export type CurrencyListType = 'iso4217' | 'crypto';

const currencies = {
    ...ISO4217,
    ...crypto,
};

export { ISO4217, crypto, currencies};