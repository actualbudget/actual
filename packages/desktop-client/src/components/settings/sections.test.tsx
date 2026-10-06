import React from 'react';

import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { useLocalPref } from '#hooks/useLocalPref';
import { TestProviders } from '#mocks';

import { ExperimentalSection } from './sections';

vi.mock('#hooks/useLocalPref', () => ({
  useLocalPref: vi.fn(),
}));

describe('ExperimentalSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing until the experimental setting is on', () => {
    vi.mocked(useLocalPref).mockReturnValue([false, vi.fn(), vi.fn()]);
    const { container } = render(
      <TestProviders>
        <ExperimentalSection />
      </TestProviders>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the feature flags once the experimental setting is on', () => {
    vi.mocked(useLocalPref).mockReturnValue([true, vi.fn(), vi.fn()]);
    render(
      <TestProviders>
        <ExperimentalSection />
      </TestProviders>,
    );

    expect(screen.getByLabelText('Goal templates')).toBeInTheDocument();
  });
});
