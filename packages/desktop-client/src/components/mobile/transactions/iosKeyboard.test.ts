import { afterEach, describe, expect, it, vi } from 'vitest';

import { primeIOSKeyboard, takePrimedIOSKeyboard } from './iosKeyboard';

const platform = vi.hoisted(() => ({ isIOS: false }));
vi.mock('@actual-app/core/shared/platform', () => platform);

describe('iosKeyboard', () => {
  afterEach(() => {
    vi.useRealTimers();
    takePrimedIOSKeyboard();
    document.body.innerHTML = '';
  });

  it('focuses a labelled stand-in field on iOS and hands it over once', () => {
    platform.isIOS = true;
    primeIOSKeyboard();

    const proxy = document.activeElement as HTMLInputElement;
    expect(proxy.tagName).toBe('INPUT');
    expect(proxy.inputMode).toBe('decimal');
    expect(proxy.getAttribute('aria-label')).toBe('Amount');
    expect(takePrimedIOSKeyboard()).toBe(true);
    expect(takePrimedIOSKeyboard()).toBe(false);

    proxy.blur();
    expect(document.body.contains(proxy)).toBe(false);
  });

  it('closes the keyboard after 3 s when nothing takes focus over', () => {
    vi.useFakeTimers();
    platform.isIOS = true;
    primeIOSKeyboard();
    const proxy = document.activeElement as HTMLInputElement;

    vi.advanceTimersByTime(3000);

    expect(takePrimedIOSKeyboard()).toBe(false);
    expect(document.body.contains(proxy)).toBe(false);
  });

  it('a second tap is not cancelled by the first tap timer', () => {
    vi.useFakeTimers();
    platform.isIOS = true;
    primeIOSKeyboard();
    vi.advanceTimersByTime(2000);
    primeIOSKeyboard();
    vi.advanceTimersByTime(1500);

    expect(takePrimedIOSKeyboard()).toBe(true);
  });

  it('does nothing outside iOS', () => {
    platform.isIOS = false;
    primeIOSKeyboard();

    expect(document.querySelector('input')).toBeNull();
    expect(takePrimedIOSKeyboard()).toBe(false);
  });
});
