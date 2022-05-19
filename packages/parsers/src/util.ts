// This is used when the input format could be anything (from
// financial files and we don't want to parse based on the user's
// number format, because the user could be importing from many
// currencies. We extract out the numbers and just ignore separators.
export function looselyParseAmount(amount: string): number {
  function safeNumber(v) {
    return isNaN(v) ? null : v;
  }

  const m = amount.match(/[.,][^.,]*$/);
  if (!m || m.index === 0) {
    return safeNumber(parseFloat(amount));
  }

  const left = amount.slice(0, m.index);
  const right = amount.slice(m.index + 1);

  return safeNumber(parseFloat(left.replace(/[^0-9-]/g, '') + '.' + right));
}
