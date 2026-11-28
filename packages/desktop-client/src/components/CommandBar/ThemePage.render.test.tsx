import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { describe, expect, it, vi } from 'vitest';

import type * as ThemeCatalogModule from '#hooks/useThemeCatalog';

import { ThemePage } from './ThemePage';

const catalog = vi.hoisted(() => {
  // Exercise malformed network data at the component's validation boundary.
  const state: { data: unknown; isLoading: boolean; error: string | null } = {
    data: null,
    isLoading: false,
    error: null,
  };
  return { state };
});
vi.mock('#hooks/useThemeCatalog', async importOriginal => ({
  ...(await importOriginal<typeof ThemeCatalogModule>()),
  useThemeCatalog: () => catalog.state,
}));
vi.mock('cmdk', () => ({
  Command: {
    Group: ({
      children,
      heading,
    }: {
      children: ReactNode;
      heading?: ReactNode;
    }) => (
      <div>
        {heading}
        {children}
      </div>
    ),
    Item: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  },
}));

const props = {
  search: 'nothing-matches',
  activeBuiltinTheme: 'light' as const,
  activeCustomThemeId: null,
  onSelectBuiltin: vi.fn(),
  onSelectCatalog: vi.fn(),
};

describe('ThemePage rendered states', () => {
  it('shows the empty state after a successful catalog load with no matches', () => {
    catalog.state = { data: [], isLoading: false, error: null };
    expect(renderToStaticMarkup(<ThemePage {...props} />)).toContain(
      'No matching themes',
    );
  });

  it('preserves built-ins when catalog rows are malformed', () => {
    catalog.state = {
      data: [
        { repo: 'owner/broken', mode: 'dark' },
        { name: 'Also broken', repo: 'owner/broken2' },
      ],
      isLoading: false,
      error: null,
    };
    const html = renderToStaticMarkup(<ThemePage {...props} search="light" />);
    expect(html).toContain('Light');
  });

  it('keeps loading and error states separate from the empty state', () => {
    catalog.state = { data: [], isLoading: true, error: null };
    expect(renderToStaticMarkup(<ThemePage {...props} />)).toContain(
      'Loading community themes',
    );
    catalog.state = { data: [], isLoading: false, error: 'offline' };
    const html = renderToStaticMarkup(<ThemePage {...props} />);
    expect(html).toContain('Could not load the community theme catalog.');
    expect(html).not.toContain('No matching themes');
  });
});
