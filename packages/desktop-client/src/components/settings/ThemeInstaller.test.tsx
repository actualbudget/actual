import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeInstaller } from './ThemeInstaller';

import { useThemeCatalog } from '@desktop-client/hooks/useThemeCatalog';
import {
  fetchThemeCss,
  generateThemeId,
  validateThemeCss,
} from '@desktop-client/style/customThemes';

vi.mock('@desktop-client/style/customThemes', async () => {
  const actual = await vi.importActual('@desktop-client/style/customThemes');
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

vi.mock('@desktop-client/hooks/useThemeCatalog', () => ({
  useThemeCatalog: vi.fn(),
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
    mockOnInstall.mockClear();
    mockOnClose.mockClear();
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

    it('clears pasted CSS when a catalog theme is selected', async () => {
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
      expect(textArea).toHaveValue('');
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

  describe('pasted CSS installation', () => {
    it('calls onInstall when valid CSS is pasted and Apply is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      const textArea = screen.getByRole('textbox', {
        name: 'Custom Theme CSS',
      });
      await user.click(textArea);
      await user.paste(mockValidCss);

      const applyButton = screen.getByText('Apply');
      await user.click(applyButton);

      await waitFor(() => {
        expect(validateThemeCss).toHaveBeenCalledWith(mockValidCss);
        expect(mockOnInstall).toHaveBeenCalledTimes(1);
        expect(mockOnInstall).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Custom Theme',
            repo: '',
            cssContent: mockValidCss,
          }),
        );
      });
    });

    it('trims whitespace from pasted CSS before validation', async () => {
      const user = userEvent.setup();
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      const textArea = screen.getByRole('textbox', {
        name: 'Custom Theme CSS',
      });
      const cssWithWhitespace = `  ${mockValidCss}  `;
      await user.click(textArea);
      await user.paste(cssWithWhitespace);

      const applyButton = screen.getByText('Apply');
      await user.click(applyButton);

      expect(validateThemeCss).toHaveBeenCalledWith(cssWithWhitespace.trim());
    });

    it('does not call onInstall when Apply is clicked with empty CSS', async () => {
      const user = userEvent.setup();
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      const applyButton = screen.getByText('Apply');
      expect(applyButton).toBeDisabled();

      await user.click(applyButton);

      expect(mockOnInstall).not.toHaveBeenCalled();
    });

    it('does not call onInstall when Apply is clicked with whitespace-only CSS', async () => {
      const user = userEvent.setup();
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      const textArea = screen.getByRole('textbox', {
        name: 'Custom Theme CSS',
      });
      await user.click(textArea);
      await user.paste('   ');

      const applyButton = screen.getByText('Apply');
      expect(applyButton).toBeDisabled();

      await user.click(applyButton);
    });

    it('populates text box with installed custom theme CSS when reopening', () => {
      const installedCustomTheme = {
        id: 'theme-abc123',
        name: 'Custom Theme',
        repo: '',
        cssContent: mockValidCss,
      };

      render(
        <ThemeInstaller
          onInstall={mockOnInstall}
          onClose={mockOnClose}
          installedTheme={installedCustomTheme}
        />,
      );

      const textArea = screen.getByRole('textbox', {
        name: 'Custom Theme CSS',
      });
      expect(textArea).toHaveValue(mockValidCss);
    });

    it('does not populate text box when installed theme has a repo', () => {
      const installedCatalogTheme = {
        id: 'theme-xyz789',
        name: 'Demo Theme',
        repo: 'https://github.com/actualbudget/demo-theme',
        cssContent: mockValidCss,
      };

      render(
        <ThemeInstaller
          onInstall={mockOnInstall}
          onClose={mockOnClose}
          installedTheme={installedCatalogTheme}
        />,
      );

      const textArea = screen.getByRole('textbox', {
        name: 'Custom Theme CSS',
      });
      expect(textArea).toHaveValue('');
    });

    it('clears selected catalog theme when CSS is pasted', async () => {
      const user = userEvent.setup();
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      // First select a theme (which should be selected/highlighted)
      await user.click(screen.getByRole('button', { name: 'Demo Theme' }));
      await waitFor(() => {
        expect(fetchThemeCss).toHaveBeenCalled();
      });

      // Then paste CSS
      const textArea = screen.getByRole('textbox', {
        name: 'Custom Theme CSS',
      });
      await user.click(textArea);
      await user.paste(mockValidCss);

      // Selection should be cleared (we can't easily test visual state,
      // but the handler should clear it)
      expect(textArea).toHaveValue(mockValidCss);
    });

    it('clears error when CSS is pasted', async () => {
      const user = userEvent.setup();
      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      // First create an error
      vi.mocked(fetchThemeCss).mockRejectedValueOnce(new Error('Test error'));
      await user.click(screen.getByRole('button', { name: 'Demo Theme' }));
      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      // Then paste CSS
      const textArea = screen.getByRole('textbox', {
        name: 'Custom Theme CSS',
      });
      await user.click(textArea);
      await user.paste(mockValidCss);

      // Error should be cleared
      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  describe('error handling for pasted CSS', () => {
    it('displays error when validateThemeCss throws for pasted CSS', async () => {
      const user = userEvent.setup();
      const validationError = 'Theme CSS must contain exactly :root';
      vi.mocked(validateThemeCss).mockImplementation(() => {
        throw new Error(validationError);
      });

      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      const textArea = screen.getByRole('textbox', {
        name: 'Custom Theme CSS',
      });
      await user.click(textArea);
      await user.paste('invalid css');

      const applyButton = screen.getByText('Apply');
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.getByText(validationError)).toBeInTheDocument();
      });

      expect(mockOnInstall).not.toHaveBeenCalled();
    });
  });

  describe('loading states', () => {
    it('disables Apply button when loading', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchThemeCss).mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve(mockValidCss), 100);
          }),
      );

      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      await user.click(screen.getByRole('button', { name: 'Demo Theme' }));

      const applyButton = screen.getByText('Apply');
      expect(applyButton).toBeDisabled();
    });

    it('disables Apply button when pasted CSS is empty during loading', async () => {
      const user = userEvent.setup();
      vi.mocked(fetchThemeCss).mockImplementation(
        () =>
          new Promise(resolve => {
            setTimeout(() => resolve(mockValidCss), 100);
          }),
      );

      render(
        <ThemeInstaller onInstall={mockOnInstall} onClose={mockOnClose} />,
      );

      // Trigger loading state
      await user.click(screen.getByRole('button', { name: 'Demo Theme' }));

      const applyButton = screen.getByText('Apply');
      expect(applyButton).toBeDisabled();
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
});
