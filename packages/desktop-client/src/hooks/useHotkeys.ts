import type { DependencyList } from 'react';
import { useHotkeys as useLibraryHotkeys } from 'react-hotkeys-hook';
import type { HotkeyCallback, Keys, Options } from 'react-hotkeys-hook';

/**
 * Wrapper around `useHotkeys` from `react-hotkeys-hook` that respects the
 * user's keyboard layout.
 *
 * By default the library matches the physical key position (`event.code`),
 * so on layouts like Dvorak or AZERTY a shortcut such as `t` only fires on
 * the key that is labelled "t" on a QWERTY keyboard. Its `useKey` option
 * adds matching by the typed character (`event.key`) but keeps the physical
 * match as well, so one key press could trigger two different shortcuts.
 *
 * This hook enables `useKey` and ignores the event when the layout typed a
 * different character (e.g. another letter or punctuation) than the
 * shortcut's letter. Layouts that don't type Latin letters (e.g. Cyrillic)
 * still fall back to the physical key.
 */
export function useHotkeys<T extends HTMLElement>(
  keys: Keys,
  callback: HotkeyCallback,
  options: Options = {},
  dependencies?: DependencyList,
) {
  const shortcutLetters = getShortcutLetters(keys, options);

  return useLibraryHotkeys<T>(
    keys,
    callback,
    {
      useKey: true,
      ...options,
      ignoreEventWhen: event =>
        isDifferentCharacter(event, shortcutLetters) ||
        (options.ignoreEventWhen?.(event) ?? false),
    },
    dependencies,
  );
}

function getShortcutLetters(keys: Keys, options: Options): Set<string> {
  const delimiter = options.delimiter ?? ',';
  const splitKey = options.splitKey ?? '+';
  const combos = typeof keys === 'string' ? keys.split(delimiter) : keys;

  const letters = new Set<string>();
  for (const combo of combos) {
    const mainKey = combo.split(splitKey).at(-1)?.trim().toLowerCase() ?? '';
    if (isLatinLetter(mainKey)) {
      letters.add(mainKey);
    }
  }
  return letters;
}

function isDifferentCharacter(
  event: KeyboardEvent,
  shortcutLetters: Set<string>,
): boolean {
  const typedKey = event.key?.toLowerCase() ?? '';
  const isSingleCharacter = [...typedKey].length === 1;
  if (
    shortcutLetters.size === 0 ||
    !isSingleCharacter ||
    shortcutLetters.has(typedKey)
  ) {
    return false;
  }
  // Letters from other scripts (e.g. Cyrillic) can't match a Latin shortcut,
  // so let those fall back to the physical key position.
  return /\p{Script=Latin}/u.test(typedKey) || !/\p{L}/u.test(typedKey);
}

function isLatinLetter(key: string): boolean {
  return /^[a-z]$/.test(key);
}
