import React, { createRef, type ComponentProps } from 'react';

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import {
  FilterButton,
  FilterEditor,
  type FilterButtonHandle,
} from './FiltersMenu';

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

describe('FilterEditor amount sign', () => {
  const renderEditor = (
    props: Partial<ComponentProps<typeof FilterEditor>> = {},
  ) => {
    const onSave = vi.fn();
    render(
      <FilterEditor
        field="amount"
        op="gt"
        // New filters render null values as empty strings.
        value=""
        onSave={onSave}
        onClose={vi.fn()}
        {...props}
      />,
      { wrapper: TestProviders },
    );
    return { onSave };
  };

  it('submits a positive amount for a filter created without a value', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor();

    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), '150');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'amount', op: 'gt', value: 15000 }),
    );
  });

  it('keeps an existing negative amount negative when edited', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({ value: -15000 });

    expect(
      screen.getByRole('button', { name: 'Make positive' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'amount', op: 'gt', value: -15000 }),
    );
  });
});
