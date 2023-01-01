function amountToInteger(n) {
  return Math.round(n * 100);
}

function integerToAmount(n) {
  return parseFloat((n / 100).toFixed(2));
}

module.exports = { amountToInteger, integerToAmount };
