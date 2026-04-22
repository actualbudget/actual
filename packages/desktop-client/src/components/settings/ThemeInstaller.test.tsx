import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useThemeCatalog } from '#hooks/useThemeCatalog';
import { resetTestProviders, TestProviders } from '#mocks';
import {
  fetchThemeCss,
  generateThemeId,
  validateThemeCss,
} from '#style/customThemes';

import { ThemeInstaller } from './ThemeInstaller';

const render: typeof rtlRender = (ui, options) =>
  rtlRender(ui, { wrapper: TestProviders, ...options });

vi.mock('#style/customThemes', async () => {
  const actual = await vi.importActual('#style/customThemes');
  return {
    ...actual,
    fetchThemeCss: vi.fn(),
    validateThemeCss: vi.fn(),
    generateThemeId: vi.fn((repo: string) => {
      // Generate predictable IDs for testing
      if (repo.includes('demo-theme')) return 'theme-demo123';
      if (repo.includes('ocean-theme')) return 'theme-ocean456';
      if (repo.includes('forest-theme')) return 'theme-forest789';
      return `theme-${repo.replace(/[^a-z0-9]/gi, '')}`;
    }),
    normalizeGitHubRepo: vi.fn((repo: string) =>
      repo.startsWith('http') ? repo : `https://github.com/${repo}`,
    ),
  };
});

vi.mock('#hooks/useThemeCatalog', () => ({
  useThemeCatalog: vi.fn(),
}));

const mockSetCustomCssOverride = vi.fn();
let mockCustomCssOverride: string | undefined = undefined;

vi.mock('#hooks/useGlobalPref', () => ({
  useGlobalPref: (key: string) => {
    if (key === 'customCssOverride') {
      return [mockCustomCssOverride, mockSetCustomCssOverride];
    }
    return [undefined, vi.fn()];
  },
}));

describe('ThemeInstaller', () => {
  const mockOnInstall = vi.fn();
  const mockOnClose = vi.fn();

  const mockValidCss = `:root {
    --color-primary: #007bff;
    --color-secondary: #6c757d;
  }`;

  const mockCatalog = [
    {
      name: 'Demo Theme',
      repo: 'actualbudget/demo-theme',
      colors: [
        '#1a1a2e',
        '#16213e',
        '#0f3460',
        '#e94560',
        '#533483',
        '#f1f1f1',
      ],
    },
    {
      name: 'Ocean Blue',
      repo: 'actualbudget/ocean-theme',
      colors: [
        '#0d47a1',
        '#1565c0',
        '#1976d2',
        '#1e88e5',
        '#42a5f5',
        '#90caf9',
      ],
    },
    {
      name: 'Forest Green',
      repo: 'actualbudget/forest-theme',
      colors: [
        '#1b5e20',
        '#2e7d32',
        '#388e3c',
        '#43a047',
        '#66bb6a',
        '#a5d6a7',
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    resetTestProviders();
    mockOnInstall.mockClear();
    mockOnClose.mockClear();
    mockSetCustomCssOverride.mockClear();
    mockCustomCssOverride = undefined;
    vi.mocked(fetchThemeCss).mockResolvedValue(mockValidCss);
    vi.mocked(validateThemeCss).mockImplementation(css => css.trim());
    // Reset generateThemeId mock to default behavior
    vi.mocked(generateThemeId).mockImplementation((repo: string) => {
      if (repo.includes('demo-theme')) return 'theme-demo123';
      if (repo.includes('ocean-theme')) return 'theme-ocean456';
      if (repo.includes('forest-theme')) return 'theme-forest789';
      return `theme-${repo.replace(/[^a-z0-9]/gi, '')}`;
    });

    // Mock useThemeCatalog to return catalog data immediately
    vi.mocked(useThemeCatalog).mockReturnValue({
      data: mockCatalog,
      isLoading: false,
      error: null,
    });
  });

  describe('rendering', () => {
    it('renders the component with title and close button', () => {
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      expect(screen.getByText('Install Custom Theme')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Close' })).toBeVisible();
    });

    it('renders catalog themes', () => {
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      expect(screen.getByRole('button', { name: 'Demo Theme' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Ocean Blue' })).toBeVisible();
      expect(
        screen.getByRole('button', { name: 'Forest Green' }),
      ).toBeVisible();
    });

    it('does not render error message initially', () => {
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      // Error messages have specific styling, check they're not present
      const errorElements = screen.queryAllByText(/Failed/i);
      expect(errorElements.length).toBe(0);
    });
  });

  describe('catalog theme selection', () => {
    it('calls onInstall when a catalog theme is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      await user.click(screen.getByRole('button', { name: 'Demo Theme' }));

      await waitFor(() => {
        expect(mockOnInstall).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Demo Theme',
            repo: 'https://github.com/actualbudget/demo-theme',
            cssContent: mockValidCss,
          }),
        );
      });
    });

    it('preserves pasted CSS when a catalog theme is selected', async () => {
      const user = userEvent.setup();
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      const textArea = screen.getByRole('textbox', {
        name: 'Custom Theme CSS',
      });
      const cssText = ':root { --color-primary: #ff0000; }';
      await user.click(textArea);
      await user.paste(cssText);

      expect(textArea).toHaveValue(cssText);

      await user.click(screen.getByRole('button', { name: 'Demo Theme' }));
      expect(textArea).toHaveValue(cssText);
    });

    it('clears error when a catalog theme is selected', async () => {
      const user = userEvent.setup();
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      // First, create an error by pasting invalid CSS
      const textArea = screen.getByRole('textbox', {
        name: 'Custom Theme CSS',
      });
      await user.click(textArea);
      await user.paste('invalid css');
      await user.click(screen.getByRole('button', { name: 'Demo Theme' }));

      expect(screen.queryByText(/Failed/i)).not.toBeInTheDocument();
    });
  });

  describe('error handling for catalog themes', () => {
    it('displays error when fetchThemeCss fails', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Network error';
      const testOnInstall = vi.fn();

      // Override the mock to reject directly BEFORE rendering
      vi.mocked(fetchThemeCss).mockImplementationOnce(() =>
        Promise.reject(new Error(errorMessage)),
      );

      render(
        <ThemeInstaller onInstall={testOnInstall} onClose={mockOnClose} />,
      );

      await user.click(screen.getByRole('button', { name: 'Demo Theme' }));

      // Wait for the error to be displayed - this confirms the rejection worked
      await waitFor(
        () => {
          expect(screen.getByText(errorMessage)).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // Verify fetchThemeCss was called with correct argument
      expect(fetchThemeCss).toHaveBeenCalledWith('actualbudget/demo-theme');

      // Since error is displayed, onInstall should NOT be called
      expect(testOnInstall).not.toHaveBeenCalled();
    });

    it('shows error styling on erroring theme and keeps previous active theme active', async () => {
      const user = userEvent.setup();
      const validationError = 'Invalid CSS format';

      // Set up a previously installed theme (Ocean Blue)
      const installedTheme = {
        id: 'theme-ocean456',
        name: 'Ocean Blue',
        repo: 'https://github.com/actualbudget/ocean-theme',
        cssContent: mockValidCss,
      };

      // Make validation fail for Demo Theme
      vi.mocked(validateThemeCss).mockImplementationOnce(() => {
        throw new Error(validationError);
      });

      render(
        <ThemeInstaller
          onInstall={mockOnInstall}
          onClose={mockOnClose}
          installedTheme={installedTheme}
        />,
      );

      // Click on Demo Theme which will fail validation
      const demoThemeButton = screen.getByRole('button', {
        name: 'Demo Theme',
      });
      await user.click(demoThemeButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(validationError)).toBeInTheDocument();
      });

      // Verify erroring theme (Demo Theme) has error styling
      await waitFor(() => {
        const demoButton = screen.getByRole('button', { name: 'Demo Theme' });
        const demoButtonStyle = demoButton.getAttribute('style') || '';
        // Check that error styling is applied - should contain CSS variable for errorText in border
        // and errorBackground in backgroundColor
        // The style will contain something like: border: "2px solid var(--color-errorText)"
        expect(demoButtonStyle).toMatch(/errorText/);
        expect(demoButtonStyle).toMatch(/errorBackground/);
      });

      // Verify previously active theme (Ocean Blue) still shows as active (not the erroring one)
      const oceanButton = screen.getByRole('button', { name: 'Ocean Blue' });
      const oceanButtonStyle = oceanButton.getAttribute('style') || '';
      // Active theme should have buttonPrimaryBackground in border (indicating it's active)
      expect(oceanButtonStyle).toMatch(/buttonPrimaryBackground/);
      // Should not have error styling - the previous active theme should remain active
      expect(oceanButtonStyle).not.toMatch(/errorText/);
      expect(oceanButtonStyle).not.toMatch(/errorBackground/);

      // Verify onInstall was not called (theme installation failed)
      expect(mockOnInstall).not.toHaveBeenCalled();
    });

    it('displays generic error when fetchThemeCss fails with non-Error object', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchThemeCss).mockRejectedValue('String error');

      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      await user.click(screen.getByRole('button', { name: 'Demo Theme' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to load theme')).toBeInTheDocument();
      });

      expect(mockOnInstall).not.toHaveBeenCalled();
    });

    it('displays error when validateThemeCss throws', async () => {
      const user = userEvent.setup();
      const validationError = 'Invalid CSS format';
      vi.mocked(validateThemeCss).mockImplementation(() => {
        throw new Error(validationError);
      });

      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      await user.click(screen.getByRole('button', { name: 'Demo Theme' }));

      await waitFor(() => {
        expect(screen.getByText(validationError)).toBeInTheDocument();
      });

      expect(mockOnInstall).not.toHaveBeenCalled();
    });
  });

  describe('close button', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('catalog theme display', () => {
    it('displays theme color palette correctly', () => {
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      // Check that color palettes are rendered instead of images
      const images = screen.queryAllByRole('img');
      expect(images.length).toBe(0);

      // Check that color swatches are rendered (6 divs per theme)
      const demoThemeButton = screen.getByRole('button', {
        name: 'Demo Theme',
      });
      const colorSwatches = demoThemeButton.querySelectorAll('[data-swatch]');
      expect(colorSwatches.length).toBe(6);
    });

    it('displays theme author correctly', () => {
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      // Author should be displayed as "by actualbudget"
      const authorTexts = screen.getAllByText(/by/i);
      expect(authorTexts.length).toBeGreaterThan(0);
    });

    it('displays source link for themes', () => {
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      const sourceLinks = screen.getAllByText('Source');
      expect(sourceLinks.length).toBeGreaterThan(0);
    });
  });

  describe('customCssOverride pref binding', () => {
    it('pre-fills the textarea from customCssOverride on mount', () => {
      mockCustomCssOverride = ':root { --color-accent: #ff00aa; }';
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );
      expect(screen.getByLabelText('Custom Theme CSS')).toHaveValue(
        ':root { --color-accent: #ff00aa; }',
      );
    });

    it('leaves the textarea empty when customCssOverride is undefined', () => {
      mockCustomCssOverride = undefined;
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );
      expect(screen.getByLabelText('Custom Theme CSS')).toHaveValue('');
    });

    it('writes validated CSS to customCssOverride when Apply is pressed', async () => {
      const user = userEvent.setup();
      mockCustomCssOverride = undefined;
      vi.mocked(validateThemeCss).mockImplementation(css => css.trim());

      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );
      const textarea = screen.getByLabelText('Custom Theme CSS');
      await user.click(textarea);
      await user.paste('  :root { --color-accent: #ff0000; }  ');
      await user.click(screen.getByRole('button', { name: 'Apply' }));

      // validateThemeCss is mocked as css => css.trim(), so the setter
      // must receive the trimmed version — not the raw pasted string.
      // This proves the Apply path runs validation, not a raw pass-through.
      expect(mockSetCustomCssOverride).toHaveBeenCalledWith(
        ':root { --color-accent: #ff0000; }',
      );
      // Textarea must also reflect the normalized value so the editor stays
      // in sync with what was actually persisted.
      expect(textarea).toHaveValue(':root { --color-accent: #ff0000; }');
    });

    it('clears customCssOverride when Apply is pressed with an empty textarea', async () => {
      const user = userEvent.setup();
      mockCustomCssOverride = ':root { --color-accent: #ff0000; }';

      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );
      const textarea = screen.getByLabelText('Custom Theme CSS');
      await user.clear(textarea);
      await user.click(screen.getByRole('button', { name: 'Apply' }));

      expect(mockSetCustomCssOverride).toHaveBeenCalledWith('');
    });

    it('shows an error and does not write when CSS is invalid', async () => {
      const user = userEvent.setup();
      mockCustomCssOverride = undefined;
      vi.mocked(validateThemeCss).mockImplementation(() => {
        throw new Error('invalid css');
      });

      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );
      const textarea = screen.getByLabelText('Custom Theme CSS');
      await user.type(textarea, 'not valid css');
      await user.click(screen.getByRole('button', { name: 'Apply' }));

      expect(mockSetCustomCssOverride).not.toHaveBeenCalled();
      expect(await screen.findByText('invalid css')).toBeInTheDocument();
    });

    it('does not touch customCssOverride when clicking a catalog theme', async () => {
      const user = userEvent.setup();
      mockCustomCssOverride = ':root { --color-accent: #ff0000; }';

      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );
      await user.click(screen.getByRole('button', { name: 'Demo Theme' }));

      await waitFor(() => {
        expect(mockOnInstall).toHaveBeenCalled();
      });
      expect(mockSetCustomCssOverride).not.toHaveBeenCalled();
    });
  });
});
