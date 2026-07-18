type EqualityFn = (newArgs: unknown[], lastArgs: unknown[]) => boolean;

function areInputsEqual(newArgs: unknown[], lastArgs: unknown[]): boolean {
  if (newArgs.length !== lastArgs.length) {
    return false;
  }
  for (let i = 0; i < newArgs.length; i++) {
    if (!Object.is(newArgs[i], lastArgs[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Minimal drop-in replacement for the `memoize-one` package: caches the result
 * of the most recent call and returns it again when called with equal arguments
 * (shallow equality by default), preserving referential stability of the result.
 */
// oxlint-disable-next-line typescript/no-explicit-any
export function memoizeOne<Args extends any[], Result>(
  fn: (...args: Args) => Result,
  isEqual: EqualityFn = areInputsEqual,
): (...args: Args) => Result {
  let cache: { args: Args; result: Result } | null = null;

  return function (this: unknown, ...args: Args): Result {
    if (cache && isEqual(args, cache.args)) {
      return cache.result;
    }
    const result = fn.apply(this, args);
    cache = { args, result };
    return result;
  };
}
