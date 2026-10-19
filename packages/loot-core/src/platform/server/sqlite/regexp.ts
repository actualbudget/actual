export function regexp(regex: string, text: string | null) {
  let pattern: RegExp;
  try {
    pattern = new RegExp(regex);
  } catch {
    // An invalid pattern, such as one still being typed into a rule
    // condition, matches nothing instead of failing the whole query. This
    // is how `matches` conditions already behave when evaluated in memory.
    return 0;
  }
  return pattern.test(text || '') ? 1 : 0;
}
