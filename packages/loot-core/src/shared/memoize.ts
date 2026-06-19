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
 *
 * Like `memoize-one`, the returned function keeps the exact type of `fn`.
 */
// oxlint-disable-next-line typescript/no-explicit-any
export function memoizeOne<T extends (...args: any[]) => any>(
  fn: T,
  isEqual: EqualityFn = areInputsEqual,
): T {
  let cache: { args: Parameters<T>; result: ReturnType<T> } | null = null;

  const memoized = function (
    this: unknown,
    ...args: Parameters<T>
  ): ReturnType<T> {
    if (cache && isEqual(args, cache.args)) {
      return cache.result;
    }
    const result = fn.apply(this, args);
    cache = { args, result };
    return result;
  };

  return memoized as T;
}
