import * as connection from '#platform/server/connection';

import {
  appendMessages,
  clearUndo,
  getUndoAvailability,
  redo,
  undo,
  withUndo,
} from './undo';

const sendSpy = vi.spyOn(connection, 'send');

const message = {
  dataset: 'notes',
  row: 'note-1',
  column: 'note',
  value: 'hello',
  timestamp: null,
};

function availabilityEvents() {
  return sendSpy.mock.calls
    .filter(([name]) => name === 'undo-availability-changed')
    .map(([, args]) => args);
}

async function recordChange() {
  await withUndo(async () => {
    appendMessages([message], new Map());
  });
}

describe('undo availability', () => {
  beforeEach(global.emptyDatabase());

  beforeEach(() => {
    clearUndo();
    sendSpy.mockClear();
  });

  it('has nothing to undo or redo when history is empty', () => {
    expect(getUndoAvailability()).toEqual({ canUndo: false, canRedo: false });
  });

  it('allows undo after a change', async () => {
    await recordChange();

    expect(getUndoAvailability()).toEqual({ canUndo: true, canRedo: false });
    expect(availabilityEvents()).toEqual([{ canUndo: true, canRedo: false }]);
  });

  it('allows redo after an undo, and undo again after a redo', async () => {
    await recordChange();
    sendSpy.mockClear();

    await undo();
    expect(getUndoAvailability()).toEqual({ canUndo: false, canRedo: true });

    await redo();
    expect(getUndoAvailability()).toEqual({ canUndo: true, canRedo: false });

    expect(availabilityEvents()).toEqual([
      { canUndo: false, canRedo: true },
      { canUndo: true, canRedo: false },
    ]);
  });

  it('drops redo when a new change is made after an undo', async () => {
    await recordChange();
    await undo();

    await recordChange();

    expect(getUndoAvailability()).toEqual({ canUndo: true, canRedo: false });
  });

  it('only notifies when availability changes', async () => {
    await recordChange();
    await recordChange();

    expect(availabilityEvents()).toEqual([{ canUndo: true, canRedo: false }]);
  });

  it('resets availability when history is cleared', async () => {
    await recordChange();
    sendSpy.mockClear();

    clearUndo();

    expect(getUndoAvailability()).toEqual({ canUndo: false, canRedo: false });
    expect(availabilityEvents()).toEqual([{ canUndo: false, canRedo: false }]);
  });
});
