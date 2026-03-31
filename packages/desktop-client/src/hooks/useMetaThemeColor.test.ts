import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMetaThemeColor } from './useMetaThemeColor';

import { usePreferredDarkTheme, useTheme } from '@desktop-client/style/theme';

const DEFAULT_THEME_COLOR = '#5c3dbb';

vi.mock('@desktop-client/style/theme', () => ({
  useTheme: vi.fn(),
  usePreferredDarkTheme: vi.fn(),
}));

function getThemeColorMeta() {
  const meta = document.querySelector('meta[name="theme-color"]');
  return meta?.getAttribute('content') ?? null;
}

function removeThemeColorMeta() {
  document.querySelector('meta[name="theme-color"]')?.remove();
}

function setCssVar(name: string, value: string) {
  document.documentElement.style.setProperty(name, value);
}

function clearCssVar(name: string) {
  document.documentElement.style.removeProperty(name);
}

beforeEach(() => {
  vi.mocked(useTheme).mockReturnValue(['light', vi.fn()]);
  vi.mocked(usePreferredDarkTheme).mockReturnValue(['dark', vi.fn()]);
  document.body.style.backgroundColor = '';
  document.documentElement.style.backgroundColor = '';
  removeThemeColorMeta();
  clearCssVar('--color-mobileViewTheme');
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useMetaThemeColor', () => {
  describe('when color is undefined', () => {
    it('does not set theme-color meta tag', () => {
      renderHook(() => useMetaThemeColor(undefined));
      expect(getThemeColorMeta()).toBeNull();
    });

    it('does not set body background-color', () => {
      renderHook(() => useMetaThemeColor(undefined));
      expect(document.body.style.backgroundColor).toBe('');
    });
  });

  describe('when color is a literal hex value', () => {
    it('sets theme-color meta content and body background to that color', () => {
      renderHook(() => useMetaThemeColor('#1a2b3c'));
      expect(getThemeColorMeta()).toBe('#1a2b3c');
      // jsdom normalizes assigned hex to rgb()
      expect(document.body.style.backgroundColor).toBe('rgb(26, 43, 60)');
    });

    it('creates theme-color meta tag if missing', () => {
      expect(getThemeColorMeta()).toBeNull();
      renderHook(() => useMetaThemeColor('#abc'));
      expect(getThemeColorMeta()).toBe('#abc');
    });
  });

  describe('when color is a CSS var()', () => {
    it('resolves the var via getComputedStyle and sets meta and body', () => {
      setCssVar('--color-mobileViewTheme', '  #fedcba  ');
      const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle');

      renderHook(() => useMetaThemeColor('var(--color-mobileViewTheme)'));

      expect(getComputedStyleSpy).toHaveBeenCalledWith(
        document.documentElement,
      );
      expect(getThemeColorMeta()).toBe('#fedcba');
      expect(document.body.style.backgroundColor).toBe('rgb(254, 220, 186)');
    });

    it('uses default when resolved var is empty', () => {
      renderHook(() => useMetaThemeColor('var(--color-mobileViewTheme)'));

      expect(getThemeColorMeta()).toBe(DEFAULT_THEME_COLOR);
      expect(document.body.style.backgroundColor).toBe('rgb(92, 61, 187)');
    });
  });

  describe('theme reactivity', () => {
    it('re-runs effect when activeTheme changes', () => {
      setCssVar('--color-mobileViewTheme', '#111');
      const { rerender } = renderHook(() =>
        useMetaThemeColor('var(--color-mobileViewTheme)'),
      );
      expect(document.body.style.backgroundColor).toBe('rgb(17, 17, 17)');

      setCssVar('--color-mobileViewTheme', '#222');
      vi.mocked(useTheme).mockReturnValue(['dark', vi.fn()]);
      rerender();
      expect(document.body.style.backgroundColor).toBe('rgb(34, 34, 34)');
    });

    it('re-runs effect when darkThemePreference changes', () => {
      setCssVar('--color-mobileViewTheme', '#aaa');
      const { rerender } = renderHook(() =>
        useMetaThemeColor('var(--color-mobileViewTheme)'),
      );
      expect(document.body.style.backgroundColor).toBe('rgb(170, 170, 170)');

      setCssVar('--color-mobileViewTheme', '#bbb');
      vi.mocked(usePreferredDarkTheme).mockReturnValue(['midnight', vi.fn()]);
      rerender();
      expect(document.body.style.backgroundColor).toBe('rgb(187, 187, 187)');
    });
  });
});
