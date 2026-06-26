import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as StyleModule from '#style';

import { ThemeSettings } from './Themes';

const mockSwitchTheme = vi.fn();
const mockSwitchDarkTheme = vi.fn();
const mockSetLight = vi.fn();
const mockSetDark = vi.fn();
const mockSetOverride = vi.fn();

let mockTheme: string = 'light';
let mockInstalledLight: string | undefined = undefined;
let mockInstalledDark: string | undefined = undefined;
let mockCustomCssOverride: string | undefined = undefined;

vi.mock('#hooks/useGlobalPref', () => ({
  useGlobalPref: (key: string) => {
    switch (key) {
      case 'installedCustomLightTheme':
        return [mockInstalledLight, mockSetLight];
      case 'installedCustomDarkTheme':
        return [mockInstalledDark, mockSetDark];
      case 'customCssOverride':
        return [mockCustomCssOverride, mockSetOverride];
      default:
        return [undefined, vi.fn()];
    }
  },
}));

vi.mock('#style', async () => {
  const actual = await vi.importActual<typeof StyleModule>('#style');
  return {
    ...actual,
    useTheme: () => [mockTheme, mockSwitchTheme],
    usePreferredDarkTheme: () => ['dark', mockSwitchDarkTheme],
  };
});

vi.mock('#components/sidebar/SidebarProvider', () => ({
  useSidebar: () => ({ floating: false }),
}));

vi.mock('#hooks/useThemeCatalog', () => ({
  useThemeCatalog: () => ({ data: [], isLoading: false, error: null }),
}));

describe('ThemeSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = 'light';
    mockInstalledLight = undefined;
    mockInstalledDark = undefined;
    mockCustomCssOverride = undefined;
  });

  describe('custom CSS override indicator', () => {
    it('is hidden when customCssOverride is undefined', () => {
      render(<ThemeSettings />);
      expect(
        screen.queryByLabelText('Custom CSS override active — click to edit'),
      ).toBeNull();
    });

    it('is hidden when customCssOverride is an empty string', () => {
      mockCustomCssOverride = '';
      render(<ThemeSettings />);
      expect(
        screen.queryByLabelText('Custom CSS override active — click to edit'),
      ).toBeNull();
    });

    it('is hidden when customCssOverride is only whitespace', () => {
      mockCustomCssOverride = '   \n  ';
      render(<ThemeSettings />);
      expect(
        screen.queryByLabelText('Custom CSS override active — click to edit'),
      ).toBeNull();
    });

    it('is visible when customCssOverride has non-whitespace content', () => {
      mockCustomCssOverride = ':root { --color-accent: #ff00aa; }';
      render(<ThemeSettings />);
      expect(
        screen.getByLabelText('Custom CSS override active — click to edit'),
      ).toBeVisible();
    });

    it('opens the installer when clicked', async () => {
      const user = userEvent.setup();
      mockCustomCssOverride = ':root { --color-accent: #ff00aa; }';
      render(<ThemeSettings />);
      await user.click(
        screen.getByLabelText('Custom CSS override active — click to edit'),
      );
      // Installer heading appears on open
      expect(screen.getByText('Install Custom Theme')).toBeVisible();
    });
  });

  describe('built-in theme selection preserves override', () => {
    it('does not call setCustomCssOverride when switching to a built-in theme', async () => {
      const user = userEvent.setup();
      mockCustomCssOverride = ':root { --color-accent: #ff00aa; }';
      render(<ThemeSettings />);

      // The Select trigger is the only "Light" button before the dropdown
      // is opened. Click it to reveal the menu.
      const select = screen.getByRole('button', { name: 'Light' });
      await user.click(select);
      // The Select component renders menu items as buttons (not options).
      // After opening, "Dark" appears as a button in the popover.
      const darkOption = await screen.findByRole('button', { name: 'Dark' });
      await user.click(darkOption);

      expect(mockSetOverride).not.toHaveBeenCalled();
      expect(mockSwitchTheme).toHaveBeenCalledWith('dark');
    });
  });
});
