export function regexp(regex: string | null, text: string | null) {
  let pattern: RegExp;
  try {
    // A NULL pattern coerces to the text 'null', as it always has
    pattern = new RegExp(String(regex));
  } catch {
    // An invalid pattern, such as one still being typed into a rule
    // condition, matches nothing instead of failing the whole query. This
    // is how `matches` conditions already behave when evaluated in memory.
    return 0;
  }
  return pattern.test(text || '') ? 1 : 0;
}
