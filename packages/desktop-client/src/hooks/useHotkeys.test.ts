import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useHotkeys } from './useHotkeys';

function pressKey(init: KeyboardEventInit) {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { bubbles: true, ...init }),
  );
  document.dispatchEvent(
    new KeyboardEvent('keyup', { bubbles: true, ...init }),
  );
}

describe('useHotkeys', () => {
  it('fires on a QWERTY layout', () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys('t', callback));

    pressKey({ key: 't', code: 'KeyT' });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('fires on the key that types the letter on a Dvorak layout', () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys('t', callback));

    // On Dvorak, "t" is typed with the key in the QWERTY "K" position.
    pressKey({ key: 't', code: 'KeyK' });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not fire on the QWERTY position when the layout types another letter', () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys('t', callback));

    // On Dvorak, the key in the QWERTY "T" position types "y".
    pressKey({ key: 'y', code: 'KeyT' });

    expect(callback).not.toHaveBeenCalled();
  });

  it('only fires the shortcut for the typed letter when shortcuts overlap', () => {
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    renderHook(() => {
      useHotkeys('d', onDelete);
      useHotkeys('e', onEdit);
    });

    // On Dvorak, "e" is typed with the key in the QWERTY "D" position.
    pressKey({ key: 'e', code: 'KeyD' });

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('does not fire when the layout types punctuation in the letter position', () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys('e', callback));

    // On Dvorak, the key in the QWERTY "E" position types ".".
    pressKey({ key: '.', code: 'KeyE' });

    expect(callback).not.toHaveBeenCalled();
  });

  it('respects the layout for shortcuts with modifiers', () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys('ctrl+b, meta+b', callback));

    // On Dvorak, the key in the QWERTY "B" position types "x".
    pressKey({ key: 'x', code: 'KeyB', ctrlKey: true });
    expect(callback).not.toHaveBeenCalled();

    // On Dvorak, "b" is typed with the key in the QWERTY "N" position.
    pressKey({ key: 'b', code: 'KeyN', ctrlKey: true });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('does not fire when the layout types an accented Latin letter in the letter position', () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys('ctrl+i', callback));

    // On a Turkish Q layout, the key in the QWERTY "I" position types "ı".
    pressKey({ key: 'ı', code: 'KeyI', ctrlKey: true });

    expect(callback).not.toHaveBeenCalled();
  });

  it('matches shift shortcuts by the typed letter', () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys('shift+t', callback));

    // On Dvorak, "T" is typed with Shift and the key in the QWERTY "K" position.
    pressKey({ key: 'T', code: 'KeyK', shiftKey: true });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('keeps matching non-letter shortcuts by physical key', () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys('0', callback));

    // On AZERTY, the "0" key types "à" without Shift.
    pressKey({ key: 'à', code: 'Digit0' });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('falls back to the physical key on layouts without Latin letters', () => {
    const callback = vi.fn();
    renderHook(() => useHotkeys('t', callback));

    // On a Russian layout, the key in the QWERTY "T" position types "е".
    pressKey({ key: 'е', code: 'KeyT' });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('still respects a custom ignoreEventWhen option', () => {
    const callback = vi.fn();
    renderHook(() =>
      useHotkeys('t', callback, { ignoreEventWhen: () => true }),
    );

    pressKey({ key: 't', code: 'KeyT' });

    expect(callback).not.toHaveBeenCalled();
  });
});
