export function cache<T>(fn: () => T): (() => T) & { clear: () => void } {
  let called = false;
  let result: T;

  const cachedFn = () => {
    if (!called) {
      result = fn();
      called = true;
    }
    return result;
  };

  cachedFn.clear = () => {
    called = false;
    result = undefined as unknown as T;
  };

  return cachedFn;
}
