import { number } from '#server/spreadsheet/globals';
import { safeNumber } from '#shared/util';

export { number } from '#server/spreadsheet/globals';

export function sumAmounts(...amounts: unknown[]): number {
  return safeNumber(
    amounts.reduce<number>((total, amount) => {
      return total + number(amount);
    }, 0),
  );
}

export function flatten2<T>(arr: T[][]): T[] {
  return Array.prototype.concat.apply([], arr);
}

export function unflatten2<T>(arr: T[]): Array<[T, T]> {
  const res: Array<[T, T]> = [];
  for (let i = 0; i < arr.length; i += 2) {
    res.push([arr[i], arr[i + 1]]);
  }
  return res;
}
