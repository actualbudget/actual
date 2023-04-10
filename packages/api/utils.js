export function amountToInteger(n) {
  return Math.round(n * 100);
}

export function integerToAmount(n) {
  return parseFloat((n / 100).toFixed(2));
}
