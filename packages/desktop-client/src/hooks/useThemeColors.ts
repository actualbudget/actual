import { useMemo } from 'react';

import { theme } from '@actual-app/components/theme';

const VAR_STRING_REGEX = /^var\((--.*)\)$/;

function getPropertyValueFromVarString(varString: string): string {
  if (VAR_STRING_REGEX.test(varString)) {
    const match = varString.match(VAR_STRING_REGEX);
    if (match) {
      return window
        .getComputedStyle(document.documentElement)
        .getPropertyValue(match[1])
        .trim();
    }
  }
  return varString;
}

export function useThemeColors(): Record<string, string> {
  return useMemo(() => {
    const colors: Record<string, string> = {};

    for (const [key, value] of Object.entries(theme)) {
      const computedValue = getPropertyValueFromVarString(value);
      if (computedValue) {
        colors[key] = computedValue;
      }
    }

    return colors;
  }, []);
}
