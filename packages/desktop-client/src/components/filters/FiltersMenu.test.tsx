import type { ComponentProps } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { FilterEditor } from './FiltersMenu';

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

describe('FilterEditor "is between"', () => {
  const renderEditor = (
    props: Partial<ComponentProps<typeof FilterEditor>> = {},
  ) => {
    const onSave = vi.fn();
    render(
      <FilterEditor
        field="date"
        op="is"
        value=""
        onSave={onSave}
        onClose={vi.fn()}
        {...props}
      />,
      { wrapper: TestProviders },
    );
    return { onSave };
  };

  it('offers the operator for dates', () => {
    renderEditor();

    expect(
      screen.getByRole('button', { name: 'is between' }),
    ).toBeInTheDocument();
  });

  it('offers the operator for amounts', () => {
    renderEditor({ field: 'amount', op: 'gt', value: '' });

    expect(
      screen.getByRole('button', { name: 'is between' }),
    ).toBeInTheDocument();
  });

  it('does not offer the operator for inflow/outflow amounts', () => {
    renderEditor({
      field: 'amount',
      op: 'gt',
      value: '',
      options: { outflow: true },
    });

    expect(
      screen.queryByRole('button', { name: 'is between' }),
    ).not.toBeInTheDocument();
  });

  it('submits both bounds of a date range', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({
      op: 'isbetween',
      value: { num1: '2020-08-10', num2: '2020-08-20' },
    });

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        field: 'date',
        op: 'isbetween',
        value: { num1: '2020-08-10', num2: '2020-08-20' },
      }),
    );
  });

  it('submits both bounds of an amount range', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({
      field: 'amount',
      op: 'isbetween',
      value: { num1: 15000, num2: 30000 },
    });

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        field: 'amount',
        op: 'isbetween',
        value: { num1: 15000, num2: 30000 },
      }),
    );
  });

  it('submits both bounds when a stored date range only has one', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({
      op: 'isbetween',
      // A hand-edited or API-created filter can arrive with a single bound
      value: { num1: '2020-08-10' } as unknown as ComponentProps<
        typeof FilterEditor
      >['value'],
    });

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        field: 'date',
        op: 'isbetween',
        value: { num1: '2020-08-10', num2: '2020-08-10' },
      }),
    );
  });

  it('submits both bounds when a stored amount range only has one', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({
      field: 'amount',
      op: 'isbetween',
      value: { num1: 15000 } as unknown as ComponentProps<
        typeof FilterEditor
      >['value'],
    });

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        field: 'amount',
        op: 'isbetween',
        value: { num1: 15000, num2: 15000 },
      }),
    );
  });

  it('seeds both bounds from the current value when the operator is selected', async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({ op: 'is', value: '2020-08-10' });

    await user.click(screen.getByRole('button', { name: 'is between' }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        field: 'date',
        op: 'isbetween',
        value: { num1: '2020-08-10', num2: '2020-08-10' },
      }),
    );
  });
});
