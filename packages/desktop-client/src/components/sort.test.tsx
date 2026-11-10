import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { render, screen } from '@testing-library/react';

import { useDragRef } from '#hooks/useDragRef';

import { useDraggable } from './sort';

function Row({ canDrag }: { canDrag: boolean }) {
  const { dragRef } = useDraggable({
    type: 'row',
    item: { id: 'row-1' },
    canDrag,
    onDragChange: vi.fn(),
  });
  const handleDragRef = useDragRef(dragRef);

  return <div data-testid="row" ref={handleDragRef} />;
}

function renderRow(canDrag: boolean) {
  return render(
    <DndProvider backend={HTML5Backend}>
      <Row canDrag={canDrag} />
    </DndProvider>,
  );
}

describe('useDraggable', () => {
  // #5620: react-dnd only consults canDrag on dragstart and leaves
  // draggable="true" on the node, which stops Firefox from placing the caret
  // in an input rendered inside it (e.g. the category rename field).
  it('mirrors canDrag onto the draggable attribute', () => {
    const { rerender } = renderRow(true);
    expect(screen.getByTestId('row')).toHaveAttribute('draggable', 'true');

    rerender(
      <DndProvider backend={HTML5Backend}>
        <Row canDrag={false} />
      </DndProvider>,
    );
    expect(screen.getByTestId('row')).toHaveAttribute('draggable', 'false');

    rerender(
      <DndProvider backend={HTML5Backend}>
        <Row canDrag />
      </DndProvider>,
    );
    expect(screen.getByTestId('row')).toHaveAttribute('draggable', 'true');
  });

  it('is not draggable when mounted while editing', () => {
    renderRow(false);
    expect(screen.getByTestId('row')).toHaveAttribute('draggable', 'false');
  });
});
