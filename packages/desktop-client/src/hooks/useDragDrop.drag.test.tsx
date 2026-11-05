import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useDrag } from './useDragDrop';

// Exercises the real react-aria useDrag (including the yarn patch to its
// useDescription helper in .yarn/patches).
describe('useDrag', () => {
  // Every transaction row calls useDrag. react-aria's useDescription used to
  // set state in a layout effect each time a row mounted, so a virtualized
  // list mounting rows while scrolling queued a synchronous re-render per
  // row, which drove React's "Maximum update depth exceeded" crash (#9170).
  it('does not re-render rows that mount after the first one', () => {
    const renders = new Map<string, number>();

    function Row({ id, canDrag }: { id: string; canDrag: boolean }) {
      renders.set(id, (renders.get(id) ?? 0) + 1);
      const { dragRef, dragProps } = useDrag({
        item: { id },
        type: 'transaction',
        canDrag,
      });
      return <div ref={dragRef} {...dragProps} data-testid={id} />;
    }

    const { rerender, getByTestId } = render(<Row id="first" canDrag />);

    rerender(
      <>
        <Row id="first" canDrag />
        <Row id="second" canDrag />
        <Row id="third" canDrag={false} />
      </>,
    );

    expect(renders.get('second')).toBe(1);
    expect(renders.get('third')).toBe(1);
    // Rows still point at the shared drag description for screen readers.
    const describedBy = getByTestId('second').getAttribute('aria-describedby');
    expect(describedBy).toMatch(/^react-aria-description-/);
    expect(document.getElementById(describedBy ?? '')).not.toBeNull();
    expect(getByTestId('first').getAttribute('aria-describedby')).toBe(
      describedBy,
    );
  });
});
