import { useMemo } from 'react';

export function useCurrentWordRange(
  inputValue: string,
  cursorPosition: number | null,
) {
  return useMemo(
    () => getCurrentWordRange(inputValue, cursorPosition),
    [inputValue, cursorPosition],
  );
}

function getCurrentWordRange(
  inputValue: string,
  cursorPosition: number | null,
): [number, number] {
  if (!cursorPosition || cursorPosition < 0) return [0, 0];
  if (cursorPosition > inputValue.length) {
    return [inputValue.length, inputValue.length];
  }
  if (inputValue.charAt(cursorPosition) === ' ') {
    return [cursorPosition, cursorPosition];
  }

  let startIdx = cursorPosition - 1;
  const endIdx = cursorPosition;

  while (startIdx > 0 && inputValue.charAt(startIdx - 1).trim() !== '') {
    startIdx--;
  }
  if (startIdx < 0 || endIdx < 0 || startIdx === endIdx) {
    return [0, 0];
  }
  return [startIdx, endIdx];
}
