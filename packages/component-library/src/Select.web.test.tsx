import * as React from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { Select } from './Select';

function press(element: HTMLElement) {
  // `usePress` falls back to mouse events in jsdom, which has no PointerEvent.
  fireEvent.mouseDown(element);
  fireEvent.mouseUp(element);
  fireEvent.click(element);
}

function openSelect(props: { isNonModal?: boolean } = {}) {
  render(
    <>
      <Select
        options={[
          ['category', 'Category'],
          ['category_group', 'Category group'],
        ]}
        value="category"
        {...props}
      />
      <button>Somewhere else</button>
    </>,
  );
  press(screen.getByRole('button', { name: 'Category' }));
  return screen.findByRole('button', { name: 'Category group' });
}

// jsdom has no hit testing, so the underlay that motivates #3051 cannot be
// clicked here. What it does show is how react-aria treats the rest of the
// page in each mode, which is the same thing the underlay follows from.
describe('Select', () => {
  it('leaves the rest of the page reachable when non-modal', async () => {
    // #3051: a modal react-aria popover also covers the page with an underlay.
    // A `Select` opened inside another popover — the transaction filter menu —
    // put that underlay over its parent and swallowed the click meant to
    // dismiss it, so the filter only closed on the second click.
    const option = await openSelect({ isNonModal: true });

    const outside = screen.getByRole('button', { name: 'Somewhere else' });
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();

    // A non-modal popover opts out of react-aria's own dismissal, so closing
    // is left to the `focusout` listener in `Popover`.
    fireEvent.focusOut(option, { relatedTarget: outside });

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Category group' }),
      ).toBeNull(),
    );
  });

  it('seals off the rest of the page by default', async () => {
    // The default has to stay modal. A `Select` inside a modal dialog renders
    // into a portal outside it and the dialog pulls focus back into itself, so
    // with `focusout` dismissal armed the options unmount from under the
    // pointer and the click lands on a detached node — which is what broke the
    // rule editor's split-amount select when every `Select` was made
    // non-modal.
    await openSelect();

    // react-aria hides everything outside a modal popover and supplies its own
    // dismiss affordance instead.
    expect(screen.queryByRole('button', { name: 'Somewhere else' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeTruthy();
  });
});
