export function amountToInteger(amount, decimalPlaces = 2) {
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(amount * multiplier);
}

export function integerToAmount(integerAmount, decimalPlaces = 2) {
  const divisor = Math.pow(10, decimalPlaces);
  return parseFloat((integerAmount / divisor).toFixed(decimalPlaces));
}
