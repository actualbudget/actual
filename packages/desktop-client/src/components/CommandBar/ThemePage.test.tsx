import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ThemePage } from './ThemePage';

const translations = vi.hoisted(() => ({
  Light: 'Clair',
  Dark: 'Sombre',
  Midnight: 'Minuit',
  'System default': 'Système',
}));

vi.mock('#hooks/useThemeCatalog', () => ({
  useThemeCatalog: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock('#style', () => ({
  themeOptions: [
    ['light', 'Light'],
    ['dark', 'Dark'],
    ['midnight', 'Midnight'],
    ['auto', 'System default'],
  ],
}));

vi.mock('#style/customThemes', () => ({
  extractRepoOwner: (repo: string) => repo.split('/')[0],
  generateThemeId: (repo: string) => repo,
  normalizeGitHubRepo: (repo: string) => repo,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => translations[key as keyof typeof translations] ?? key,
  }),
  Trans: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('cmdk', () => ({
  Command: {
    Group: ({
      children,
      heading,
    }: {
      children: ReactNode;
      heading: string;
    }) => <section aria-label={heading}>{children}</section>,
    Item: ({ children }: { children: ReactNode }) => (
      <div data-testid="theme-item">{children}</div>
    ),
  },
}));

vi.mock('./primitives', () => ({
  Highlight: ({ text }: { text: string }) => text,
  KeyChip: ({ children }: { children: ReactNode }) => children,
}));

describe('ThemePage', () => {
  it('searches built-in themes by their translated label', () => {
    const onSelectBuiltin = vi.fn();

    render(
      <ThemePage
        search="clair"
        activeBuiltinTheme="light"
        activeCustomThemeId={null}
        onSelectBuiltin={onSelectBuiltin}
        onSelectCatalog={vi.fn()}
      />,
    );

    expect(screen.getByTestId('theme-item')).toHaveTextContent('Clair');
    expect(screen.queryByText('Sombre')).toBeNull();
  });
});
