import * as React from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { Select } from './Select';

function press(element: HTMLElement) {
  // `usePress` falls back to mouse events in jsdom, which has no PointerEvent.
  fireEvent.mouseDown(element);
  fireEvent.mouseUp(element);
  fireEvent.click(element);
}

function renderSelect(props: { isNonModal?: boolean } = {}) {
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

function blurOntoTheRestOfThePage(option: HTMLElement) {
  fireEvent.focusOut(option, {
    relatedTarget: screen.getByRole('button', { name: 'Somewhere else' }),
  });
}

describe('Select', () => {
  // `isNonModal` is the only observable difference between the two modes in
  // jsdom: `Popover` registers its `focusout` dismissal only for a non-modal
  // popover, and jsdom has no hit testing, so the underlay that motivates
  // #3051 cannot be exercised here. The e2e suite covers the click itself.
  it('dismisses a non-modal popover when focus leaves it', async () => {
    // #3051: a modal react-aria popover also renders a full-viewport underlay.
    // A `Select` opened inside another popover — the transaction filter menu —
    // put that underlay over its parent and swallowed the click meant to
    // dismiss it, so the filter only closed on the second click. Non-modal
    // leaves dismissal to the `focusout` listener in `Popover`.
    const option = await renderSelect({ isNonModal: true });

    blurOntoTheRestOfThePage(option);

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Category group' }),
      ).toBeNull(),
    );
  });

  it('keeps a modal popover open when focus leaves it', async () => {
    // The default has to stay modal. A `Select` inside a modal dialog is
    // rendered into a portal outside it, and the dialog pulls focus back into
    // itself — so with `focusout` dismissal armed the options unmount from
    // under the pointer and the click lands on a detached node. That is what
    // broke the rule editor's split-amount select when every `Select` was made
    // non-modal.
    const option = await renderSelect();

    blurOntoTheRestOfThePage(option);

    // Give a dismissal the same chance to run as in the test above. `option`
    // itself stays truthy once unmounted, so the query has to be re-run.
    await Promise.resolve();
    expect(screen.getByRole('button', { name: 'Category group' })).toBe(option);
  });
});
