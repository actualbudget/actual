import React, { createRef } from 'react';

import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { FilterButton } from './FiltersMenu';
import type { FilterButtonHandle } from './FiltersMenu';

describe('FilterButton imperative handle', () => {
  it('opens the existing filter picker through its reducer', async () => {
    const ref = createRef<FilterButtonHandle>();

    render(
      <TestProviders>
        <FilterButton
          ref={ref}
          compact={false}
          hover={false}
          onApply={vi.fn()}
        />
      </TestProviders>,
    );

    expect(
      screen.queryByTestId('filters-select-tooltip'),
    ).not.toBeInTheDocument();

    await act(async () => {
      ref.current?.open();
    });

    expect(screen.getByTestId('filters-select-tooltip')).toBeInTheDocument();
  });
});
