import type { ComponentProps, ReactElement } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BaseAmountLabels } from '#hooks/currencyFormatContext';
import { TestProviders } from '#mocks';

import { FilterButton, FilterEditor } from './FiltersMenu';

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

describe('FilterButton amount label', () => {
  const renderButton = (wrap: (node: ReactElement) => ReactElement) =>
    render(
      wrap(<FilterButton onApply={vi.fn()} compact={false} hover={false} />),
      {
        wrapper: TestProviders,
      },
    );

  it('names base amounts in a foreign register', async () => {
    renderButton(node => <BaseAmountLabels enabled>{node}</BaseAmountLabels>);
    await userEvent.click(screen.getByRole('button', { name: /Filter/ }));
    expect(await screen.findByText('Base amount')).toBeInTheDocument();
    expect(screen.queryByText('Amount')).not.toBeInTheDocument();
  });

  it('keeps Amount elsewhere', async () => {
    renderButton(node => node);
    await userEvent.click(screen.getByRole('button', { name: /Filter/ }));
    expect(await screen.findByText('Amount')).toBeInTheDocument();
  });
});
