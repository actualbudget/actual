import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetTestProviders, TestProviders } from '#mocks';
import { mergeGlobalPrefs } from '#prefs/prefsSlice';
import { useStore } from '#redux';
import { usePreferredDarkTheme, useTheme } from '#style/theme';

import { useMetaThemeColor } from './useMetaThemeColor';

const DEFAULT_THEME_COLOR = '#5c3dbb';
const originalMatchMedia = window.matchMedia;

function renderThemeColor(color?: string) {
  return renderHook(
    () => {
      useMetaThemeColor(color);
      return useStore();
    },
    { wrapper: TestProviders },
  );
}

vi.mock('#style/theme', () => ({
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
  resetTestProviders();
  vi.mocked(useTheme).mockReturnValue(['light', vi.fn()]);
  vi.mocked(usePreferredDarkTheme).mockReturnValue(['dark', vi.fn()]);
  document.body.style.backgroundColor = '';
  document.documentElement.style.backgroundColor = '';
  removeThemeColorMeta();
  clearCssVar('--color-mobileViewTheme');
});

afterEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: originalMatchMedia,
  });
});

describe('useMetaThemeColor', () => {
  describe('when color is undefined', () => {
    it('does not set theme-color meta tag', () => {
      renderThemeColor(undefined);
      expect(getThemeColorMeta()).toBeNull();
    });

    it('does not set body background-color', () => {
      renderThemeColor(undefined);
      expect(document.body.style.backgroundColor).toBe('');
    });
  });

  describe('when color is a literal hex value', () => {
    it('sets theme-color meta content and body background to that color', () => {
      renderThemeColor('#1a2b3c');
      expect(getThemeColorMeta()).toBe('#1a2b3c');
      // jsdom normalizes assigned hex to rgb()
      expect(document.body.style.backgroundColor).toBe('rgb(26, 43, 60)');
    });

    it('creates theme-color meta tag if missing', () => {
      expect(getThemeColorMeta()).toBeNull();
      renderThemeColor('#abc');
      expect(getThemeColorMeta()).toBe('#abc');
    });
  });

  describe('when color is a CSS var()', () => {
    it('resolves the var via getComputedStyle and sets meta and body', () => {
      setCssVar('--color-mobileViewTheme', '  #fedcba  ');
      const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle');

      renderThemeColor('var(--color-mobileViewTheme)');

      expect(getComputedStyleSpy).toHaveBeenCalledWith(
        document.documentElement,
      );
      expect(getThemeColorMeta()).toBe('#fedcba');
      expect(document.body.style.backgroundColor).toBe('rgb(254, 220, 186)');
    });

    it('uses default when resolved var is empty', () => {
      renderThemeColor('var(--color-mobileViewTheme)');

      expect(getThemeColorMeta()).toBe(DEFAULT_THEME_COLOR);
      expect(document.body.style.backgroundColor).toBe('rgb(92, 61, 187)');
    });
  });

  describe('theme reactivity', () => {
    it('re-runs effect when activeTheme changes', () => {
      setCssVar('--color-mobileViewTheme', '#111');
      const { rerender } = renderThemeColor('var(--color-mobileViewTheme)');
      expect(document.body.style.backgroundColor).toBe('rgb(17, 17, 17)');

      setCssVar('--color-mobileViewTheme', '#222');
      vi.mocked(useTheme).mockReturnValue(['dark', vi.fn()]);
      rerender();
      expect(document.body.style.backgroundColor).toBe('rgb(34, 34, 34)');
    });

    it('re-runs effect when darkThemePreference changes', () => {
      setCssVar('--color-mobileViewTheme', '#aaa');
      const { rerender } = renderThemeColor('var(--color-mobileViewTheme)');
      expect(document.body.style.backgroundColor).toBe('rgb(170, 170, 170)');

      setCssVar('--color-mobileViewTheme', '#bbb');
      vi.mocked(usePreferredDarkTheme).mockReturnValue(['midnight', vi.fn()]);
      rerender();
      expect(document.body.style.backgroundColor).toBe('rgb(187, 187, 187)');
    });

    it('refreshes meta colour and body background when customCssOverride changes while mounted', () => {
      setCssVar('--color-mobileViewTheme', '#111');
      const { result } = renderThemeColor('var(--color-mobileViewTheme)');
      expect(getThemeColorMeta()).toBe('#111');
      expect(document.body.style.backgroundColor).toBe('rgb(17, 17, 17)');

      act(() => {
        // Supply the updated CSS; the preference subscription must trigger
        // the colour refresh without remounting or changing the hook argument.
        setCssVar('--color-mobileViewTheme', '#222');
        result.current.dispatch(
          mergeGlobalPrefs({
            customCssOverride: ':root { --color-mobileViewTheme: #222; }',
          }),
        );
      });

      expect({
        meta: getThemeColorMeta(),
        background: document.body.style.backgroundColor,
      }).toEqual({ meta: '#222', background: 'rgb(34, 34, 34)' });
    });

    it('re-runs effect when system color scheme changes', async () => {
      let matches = false;
      const listeners = new Set<() => void>();
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          get matches() {
            return matches;
          },
          media: query,
          onchange: null,
          addEventListener: vi.fn((event: string, listener: () => void) => {
            if (event === 'change') {
              listeners.add(listener);
            }
          }),
          removeEventListener: vi.fn((event: string, listener: () => void) => {
            if (event === 'change') {
              listeners.delete(listener);
            }
          }),
          dispatchEvent: vi.fn(),
        })),
      });

      setCssVar('--color-mobileViewTheme', '#111');
      renderThemeColor('var(--color-mobileViewTheme)');
      expect(document.body.style.backgroundColor).toBe('rgb(17, 17, 17)');
      expect(listeners.size).toBe(1);

      setCssVar('--color-mobileViewTheme', '#222');
      matches = true;
      act(() => {
        listeners.forEach(listener => listener());
      });

      await waitFor(() => {
        expect(document.body.style.backgroundColor).toBe('rgb(34, 34, 34)');
      });
    });
  });
});
