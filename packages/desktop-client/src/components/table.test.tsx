import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  SelectedProvider,
  useSelected,
  useSelectedItems,
} from '#hooks/useSelected';
import { TestProviders } from '#mocks';

import { CustomCell, InputCell, useTableNavigator } from './table';

function NavigableTable() {
  const navigator = useTableNavigator([{ id: 'row' }], ['value']);
  const { innerRef, ...navigatorProps } = navigator.getNavigatorProps({
    tabIndex: 0,
  });
  return (
    <>
      <div {...navigatorProps} ref={innerRef} data-testid="table">
        <button onClick={() => navigator.beginEdit('row', 'value')}>
          Edit cell
        </button>
        <button>Header action</button>
        <span>{navigator.isEditing ? 'Editing' : 'Idle'}</span>
      </div>
      <button>Outside table</button>
    </>
  );
}

type CheckableItem = { id: string; checkable: boolean };

function CheckableRows({ items }: { items: CheckableItem[] }) {
  const navigator = useTableNavigator(items, item =>
    item?.checkable ? ['select', 'value'] : ['value'],
  );
  const checked = useSelectedItems();
  const { innerRef, ...navigatorProps } = navigator.getNavigatorProps({
    tabIndex: 0,
  });
  return (
    <div {...navigatorProps} ref={innerRef} data-testid="table">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => navigator.beginEdit(item.id, 'value')}
        >
          Edit {item.id}
        </button>
      ))}
      <span>Cursor: {navigator.cursor?.id ?? 'none'}</span>
      <span>{navigator.isEditing ? 'Editing' : 'Idle'}</span>
      <span>Checked: {[...checked].join(',') || 'none'}</span>
    </div>
  );
}

function CheckableTable({ items }: { items: CheckableItem[] }) {
  const selected = useSelected('items', items, []);
  return (
    <SelectedProvider instance={selected}>
      <CheckableRows items={items} />
    </SelectedProvider>
  );
}

function renderEditor() {
  const onUpdate = vi.fn();
  const onExit = vi.fn();
  function editor(exposed: boolean, committedValue = 'original') {
    return (
      <TestProviders>
        <CustomCell
          value={committedValue}
          exposed={exposed}
          onUpdate={onUpdate}
          onExit={onExit}
        >
          {({ value, onUpdate, onSave, onKeyDown, onBlur }) => (
            <>
              <input
                aria-label="Draft"
                value={value}
                onChange={event => onUpdate(event.target.value)}
                onKeyDown={onKeyDown}
                onBlur={onBlur}
              />
              <button onClick={() => onSave('selected')}>Select value</button>
              <button onClick={() => onSave(committedValue)}>
                Save unchanged
              </button>
            </>
          )}
        </CustomCell>
      </TestProviders>
    );
  }
  const { rerender } = render(editor(true));
  return {
    onUpdate,
    onExit,
    setEditing: (exposed: boolean, committedValue?: string) =>
      rerender(editor(exposed, committedValue)),
  };
}

describe('CustomCell edit sessions', () => {
  it.each(['cancel', 'save unchanged', 'blur unchanged'])(
    'can select a value without typing after reopening following %s',
    action => {
      const { setEditing, onUpdate } = renderEditor();
      const input = screen.getByRole('textbox');
      if (action === 'cancel') {
        fireEvent.keyDown(input, { key: 'Escape' });
      } else if (action === 'save unchanged') {
        fireEvent.click(screen.getByRole('button', { name: 'Save unchanged' }));
      } else {
        const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(true);
        fireEvent.blur(input);
        hasFocus.mockRestore();
        expect(onUpdate).toHaveBeenCalledTimes(1);
      }
      setEditing(false);
      onUpdate.mockClear();
      setEditing(true);

      fireEvent.click(screen.getByRole('button', { name: 'Select value' }));
      fireEvent.blur(screen.getByRole('textbox'));

      expect(onUpdate).toHaveBeenCalledExactlyOnceWith('selected');
    },
  );

  it('can cancel again after reopening without typing', () => {
    const { setEditing, onExit, onUpdate } = renderEditor();
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(onExit).toHaveBeenCalledTimes(1);
    setEditing(false);
    setEditing(true);

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

    expect(onExit).toHaveBeenCalledTimes(2);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('discards a draft without saving it on the following blur', () => {
    const { onExit, onUpdate } = renderEditor();
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'discard me' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.blur(input);

    expect(input).toHaveValue('original');
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('uses the latest committed value in the next session', () => {
    const { setEditing, onUpdate } = renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Select value' }));
    setEditing(false, 'selected');
    setEditing(true, 'selected');
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('selected');
    fireEvent.change(input, { target: { value: 'discard me' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.blur(input);

    expect(input).toHaveValue('selected');
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('selected');
  });

  it('does not save twice when a commit updates the prop before blur', () => {
    const { setEditing, onUpdate } = renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Select value' }));
    setEditing(true, 'selected');
    fireEvent.blur(screen.getByRole('textbox'));

    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('selected');
  });

  it('exits on escape after a commit that stays in the cell, keeping the value', () => {
    const { onExit, onUpdate } = renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Select value' }));
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.blur(input);

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('selected');
    expect(input).toHaveValue('selected');
  });

  it('does not save or end the session when the app loses focus', () => {
    const { onUpdate } = renderEditor();
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'draft' } });

    const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    try {
      fireEvent.blur(input);
      expect(onUpdate).not.toHaveBeenCalled();

      hasFocus.mockReturnValue(true);
      fireEvent.blur(input);
      expect(onUpdate).toHaveBeenCalledExactlyOnceWith('draft');
    } finally {
      hasFocus.mockRestore();
    }
  });
});

describe('InputCell edit sessions', () => {
  function renderInputCell() {
    const onUpdate = vi.fn();
    render(
      <TestProviders>
        <InputCell
          name="amount"
          width={100}
          value="1.50"
          exposed
          onUpdate={onUpdate}
          onExit={vi.fn()}
        />
      </TestProviders>,
    );
    return { onUpdate, input: screen.getByRole('textbox') };
  }

  it('reports an unedited value as not edited', () => {
    const { onUpdate, input } = renderInputCell();
    fireEvent.blur(input);

    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('1.50', false);
  });

  it('reports a typed value as edited', () => {
    const { onUpdate, input } = renderInputCell();
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('2', true);
  });

  it('still reports the blur after escape, without saving', () => {
    const onUpdate = vi.fn();
    const onBlur = vi.fn();
    render(
      <TestProviders>
        <InputCell
          width={100}
          value="1.50"
          exposed
          onUpdate={onUpdate}
          onBlur={onBlur}
        />
      </TestProviders>,
    );
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    fireEvent.blur(input);
    hasFocus.mockRestore();

    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('discards a typed value on escape', () => {
    const { onUpdate, input } = renderInputCell();
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.blur(input);

    expect(input).toHaveValue('1.50');
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

it('leaving a table ends editing without stealing focus from the clicked control', async () => {
  // jsdom does not have a focused browser window.
  const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  try {
    render(
      <TestProviders>
        <NavigableTable />
      </TestProviders>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Edit cell' }));
    expect(screen.getByText('Editing')).toBeInTheDocument();
    const focusTable = vi.spyOn(screen.getByTestId('table'), 'focus');
    const outsideButton = screen.getByRole('button', { name: 'Outside table' });
    await userEvent.click(outsideButton);

    expect(focusTable).not.toHaveBeenCalled();
    expect(outsideButton).toHaveFocus();
    expect(screen.getByText('Idle')).toBeInTheDocument();
  } finally {
    hasFocus.mockRestore();
  }
});

it('keys on other controls inside the table are not taken as cell navigation', async () => {
  const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  try {
    render(
      <TestProviders>
        <NavigableTable />
      </TestProviders>,
    );
    // Leave a cursor behind from an earlier edit
    await userEvent.click(screen.getByRole('button', { name: 'Edit cell' }));
    await userEvent.keyboard('[Escape]');
    expect(screen.getByText('Idle')).toBeInTheDocument();

    screen.getByRole('button', { name: 'Header action' }).focus();
    await userEvent.keyboard('[Enter]');
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(screen.getByText('Idle')).toBeInTheDocument();
  } finally {
    hasFocus.mockRestore();
  }
});

it.each([
  ['one Enter', 1],
  ['two Enters', 2],
])(
  'escape after %s on the last row does not reopen the cell',
  async (_, presses) => {
    const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    try {
      render(
        <TestProviders>
          <NavigableTable />
        </TestProviders>,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Edit cell' }));
      // Each Enter on the last row starts a flash that reopens the cell
      await userEvent.keyboard('[Enter]'.repeat(presses) + '[Escape]');
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(screen.getByText('Idle')).toBeInTheDocument();
    } finally {
      hasFocus.mockRestore();
    }
  },
);

it('drops the selected cell when its row leaves the data', async () => {
  const items = [
    { id: 'a', checkable: true },
    { id: 'b', checkable: true },
  ];
  const { rerender } = render(
    <TestProviders>
      <CheckableTable items={items} />
    </TestProviders>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Edit b' }));
  await userEvent.keyboard('[Escape]');
  expect(screen.getByText('Cursor: b')).toBeInTheDocument();

  rerender(
    <TestProviders>
      <CheckableTable items={items.slice(0, 1)} />
    </TestProviders>,
  );
  screen.getByTestId('table').focus();
  await userEvent.keyboard('[Space]');

  expect(screen.getByText('Cursor: none')).toBeInTheDocument();
  expect(screen.getByText('Checked: none')).toBeInTheDocument();
});

it('stops editing when the edited row leaves the data', async () => {
  const items = [
    { id: 'a', checkable: true },
    { id: 'b', checkable: true },
  ];
  function table(rows: CheckableItem[]) {
    return (
      <TestProviders>
        <CheckableTable items={rows} />
      </TestProviders>
    );
  }
  const { rerender } = render(table(items));
  await userEvent.click(screen.getByRole('button', { name: 'Edit b' }));
  expect(screen.getByText('Editing')).toBeInTheDocument();

  rerender(table(items.slice(0, 1)));
  expect(screen.getByText('Idle')).toBeInTheDocument();

  // The row coming back doesn't reopen its editor
  rerender(table(items));
  expect(screen.getByText('Cursor: b')).toBeInTheDocument();
  expect(screen.getByText('Idle')).toBeInTheDocument();
});

it('a row that leaves during the edge flash is not reopened when it returns', async () => {
  const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  try {
    const items = [
      { id: 'a', checkable: true },
      { id: 'b', checkable: true },
    ];
    function table(rows: CheckableItem[]) {
      return (
        <TestProviders>
          <CheckableTable items={rows} />
        </TestProviders>
      );
    }
    const { rerender } = render(table(items));
    await userEvent.click(screen.getByRole('button', { name: 'Edit b' }));
    // Enter on the last row starts a flash that would reopen the cell
    await userEvent.keyboard('[Enter]');
    rerender(table(items.slice(0, 1)));
    rerender(table(items));
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(screen.getByText('Cursor: b')).toBeInTheDocument();
    expect(screen.getByText('Idle')).toBeInTheDocument();
  } finally {
    hasFocus.mockRestore();
  }
});

it('space does not check a row without a checkbox', async () => {
  render(
    <TestProviders>
      <CheckableTable
        items={[
          { id: 'a', checkable: true },
          { id: 'b', checkable: false },
        ]}
      />
    </TestProviders>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Edit b' }));
  await userEvent.keyboard('[Escape][Space]');
  expect(screen.getByText('Checked: none')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Edit a' }));
  await userEvent.keyboard('[Escape][Space]');
  expect(screen.getByText('Checked: a')).toBeInTheDocument();
});
