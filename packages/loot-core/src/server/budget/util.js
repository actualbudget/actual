import { safeNumber } from '../../shared/util';
import { number } from '../spreadsheet/globals';

export { number } from '../spreadsheet/globals';

export function sumAmounts(...amounts) {
  return safeNumber(
    amounts.reduce((total, amount) => {
      return total + number(amount);
    }, 0)
  );
}

export function flatten2(arr) {
  return Array.prototype.concat.apply([], arr);
}

export function unflatten2(arr) {
  let res = [];
  for (let i = 0; i < arr.length; i += 2) {
    res.push([arr[i], arr[i + 1]]);
  }
  return res;
}
