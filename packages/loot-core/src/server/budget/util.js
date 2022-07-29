import { number } from '../spreadsheet/globals';

export { number } from '../spreadsheet/globals';

export function sumAmounts(...amounts) {
  return amounts.reduce((total, amount) => {
    return total + number(amount);
  }, 0);
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

// Note that we don't restrict values to `Number.MIN_SAFE_INTEGER <= value <= Number.MAX_SAFE_INTEGER`
// where `Number.MAX_SAFE_INTEGER == 2^53 - 1` but a smaller range over `-(2^43-1) <= value <= 2^43 - 1`.
// This ensure that the number is accurate not just for the integer component but for 3 decimal places also.
//
// This gives us the guarantee that can use `safeNumber` on number whether they are unscaled user inputs
// or they have been converted to integers (using `amountToInteger`).

const MAX_SAFE_NUMBER = 2 ** 43 - 1;
const MIN_SAFE_NUMBER = -MAX_SAFE_NUMBER;

export function safeNumber(value) {
  value = number(value);
  if (value > MAX_SAFE_NUMBER || value < MIN_SAFE_NUMBER) {
    throw new Error(
      "Can't safely perform arithmetic with number: " + JSON.stringify(value)
    );
  }
  return value;
}
