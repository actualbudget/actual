import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { CustomCell, useTableNavigator } from './table';

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
        <span>{navigator.isEditing ? 'Editing' : 'Idle'}</span>
      </div>
      <button>Outside table</button>
    </>
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
        fireEvent.blur(input);
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
