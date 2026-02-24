import { describe, expect, it } from 'vitest';

import {
  menuAutoCompleteBackgroundHover,
  menuAutoCompleteTextHover,
} from './midnight';

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  const int = Number.parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function toLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(foreground: string, background: string) {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('midnight theme autocomplete contrast', () => {
  it('keeps highlighted create-payee text readable on its hover background', () => {
    const ratio = contrastRatio(
      menuAutoCompleteTextHover,
      menuAutoCompleteBackgroundHover,
    );

    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
