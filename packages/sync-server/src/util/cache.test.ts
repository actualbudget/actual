import { cache } from './cache.js';

describe('cache utility', () => {
  it('memoizes the result and calls the provider only once', () => {
    let value = 0;
    const provider = vi.fn(() => ++value);
    const getVal = cache(provider);

    const first = getVal();
    const second = getVal();

    expect(first).toBe(1);
    expect(second).toBe(1);
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it('recomputes after clear is called', () => {
    let value = 0;
    const provider = vi.fn(() => ++value);
    const getVal = cache(provider);

    expect(getVal()).toBe(1);
    expect(provider).toHaveBeenCalledTimes(1);

    getVal.clear();
    expect(getVal()).toBe(2);
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it('clear before first call does not invoke provider', () => {
    const provider = vi.fn(() => 42);
    const getVal = cache(provider);

    getVal.clear();
    expect(provider).not.toHaveBeenCalled();

    expect(getVal()).toBe(42);
    expect(provider).toHaveBeenCalledTimes(1);
  });
});
