import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { Command } from 'cmdk';
import { describe, expect, it, vi } from 'vitest';

import { ThemePage } from './ThemePage';

const translations: Readonly<Record<string, string>> = vi.hoisted(() => ({
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
    t: (key: string) => translations[key] ?? key,
  }),
  Trans: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('./primitives', () => ({
  Highlight: ({ text }: { text: string }) => text,
  KeyChip: ({ children }: { children: ReactNode }) => children,
}));

describe('ThemePage', () => {
  it('searches built-in themes by their translated label', () => {
    const onSelectBuiltin = vi.fn();

    render(
      <Command>
        <ThemePage
          search="clair"
          activeBuiltinTheme="light"
          activeCustomThemeId={null}
          onSelectBuiltin={onSelectBuiltin}
          onSelectCatalog={vi.fn()}
        />
      </Command>,
    );

    expect(screen.getByRole('option')).toHaveTextContent('Clair');
    expect(screen.queryByText('Sombre')).toBeNull();
  });
});
