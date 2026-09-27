import * as React from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { Select } from './Select';

function press(element: HTMLElement) {
  // `usePress` falls back to mouse events in jsdom, which has no PointerEvent.
  fireEvent.mouseDown(element);
  fireEvent.mouseUp(element);
  fireEvent.click(element);
}

describe('Select', () => {
  it('opens its options in a non-modal popover', async () => {
    // Regression test for #3051. A modal react-aria popover also renders a
    // full-viewport underlay. When a `Select` is opened inside another popover
    // — the transaction filter menu, for example — that underlay swallows the
    // click meant to dismiss the popover behind it, so the whole thing only
    // closes on the second click.
    render(
      <Select
        options={[
          ['category', 'Category'],
          ['category_group', 'Category group'],
        ]}
        value="category"
      />,
    );

    press(screen.getByRole('button', { name: 'Category' }));

    // The options are showing...
    expect(
      await screen.findByRole('button', { name: 'Category group' }),
    ).toBeTruthy();
    // ...and nothing is covering the rest of the page.
    expect(screen.queryByTestId('underlay')).toBeNull();
  });

  it('closes its options when focus leaves', async () => {
    // A non-modal popover opts out of react-aria's dismiss handling, so
    // closing is left to the `focusout` listener in `Popover`.
    render(
      <>
        <Select
          options={[
            ['category', 'Category'],
            ['category_group', 'Category group'],
          ]}
          value="category"
        />
        <button>Somewhere else</button>
      </>,
    );

    press(screen.getByRole('button', { name: 'Category' }));
    const option = await screen.findByRole('button', {
      name: 'Category group',
    });

    fireEvent.focusOut(option, {
      relatedTarget: screen.getByRole('button', { name: 'Somewhere else' }),
    });

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Category group' }),
      ).toBeNull(),
    );
  });
});
