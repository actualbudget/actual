import type { DropEvent, DropOptions, TextDropItem } from 'react-aria';

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDrop } from './useDragDrop';

// Capture the options passed to react-aria so the test can replay the event
// sequence react-aria produces for a real drop.
const captured = vi.hoisted(() => ({ options: null as DropOptions | null }));

vi.mock('react-aria', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useDrop: (options: DropOptions) => {
      captured.options = options;
      return { dropProps: {}, isDropTarget: false };
    },
  };
});

function textItem(type: string, data: string): TextDropItem {
  return {
    kind: 'text',
    types: new Set([type]),
    getText: async () => data,
  };
}

function dropEvent(items: DropEvent['items']): DropEvent {
  return { type: 'drop', x: 0, y: 0, items, dropOperation: 'move' };
}

function setup() {
  const onDrop = vi.fn();
  const hook = renderHook(() =>
    useDrop<{ id: string }>({ types: 'transaction', id: 'target', onDrop }),
  );

  // A 100px tall row starting at y=100.
  const element = document.createElement('div');
  element.getBoundingClientRect = () =>
    ({
      top: 100,
      bottom: 200,
      left: 0,
      right: 500,
      height: 100,
      width: 500,
    }) as DOMRect;
  hook.result.current.dropRef.current = element;

  return { ...hook, onDrop, element };
}

function hover(element: HTMLElement, clientY: number) {
  const event = new Event('dragover') as DragEvent;
  Object.assign(event, { clientX: 10, clientY });
  act(() => {
    element.dispatchEvent(event);
  });
}

// react-aria calls onDrop (which we implement as async) and then fires
// onDropExit synchronously, before any awaited work in onDrop resolves.
async function drop(items: DropEvent['items']) {
  await act(async () => {
    const pending = captured.options?.onDrop?.(dropEvent(items));
    captured.options?.onDropExit?.({ type: 'dropexit', x: 0, y: 0 });
    await pending;
  });
}

describe('useDrop drop position', () => {
  beforeEach(() => {
    captured.options = null;
  });

  it('drops before the target when released over its top half', async () => {
    const { result, onDrop, element } = setup();
    act(() =>
      captured.options?.onDropEnter?.({ type: 'dropenter', x: 0, y: 0 }),
    );

    hover(element, 120);
    expect(result.current.dropPos).toBe('before');

    await drop([textItem('transaction', JSON.stringify({ id: 'dragged' }))]);

    expect(onDrop).toHaveBeenCalledWith('dragged', 'before', 'target');
  });

  it('drops after the target when released over its bottom half', async () => {
    const { result, onDrop, element } = setup();
    act(() =>
      captured.options?.onDropEnter?.({ type: 'dropenter', x: 0, y: 0 }),
    );

    hover(element, 180);
    expect(result.current.dropPos).toBe('after');

    await drop([textItem('transaction', JSON.stringify({ id: 'dragged' }))]);

    expect(onDrop).toHaveBeenCalledWith('dragged', 'after', 'target');
  });

  it('treats the exact middle as after', async () => {
    const { onDrop, element } = setup();
    act(() =>
      captured.options?.onDropEnter?.({ type: 'dropenter', x: 0, y: 0 }),
    );

    hover(element, 150);
    await drop([textItem('transaction', JSON.stringify({ id: 'dragged' }))]);

    expect(onDrop).toHaveBeenCalledWith('dragged', 'after', 'target');
  });

  it('falls back to after when there was no dragover', async () => {
    const { onDrop } = setup();

    await drop([textItem('transaction', JSON.stringify({ id: 'dragged' }))]);

    expect(onDrop).toHaveBeenCalledWith('dragged', 'after', 'target');
  });

  it('clears the drop position when the cursor leaves the target', () => {
    const { result, element } = setup();
    act(() =>
      captured.options?.onDropEnter?.({ type: 'dropenter', x: 0, y: 0 }),
    );

    hover(element, 120);
    expect(result.current.dropPos).toBe('before');

    hover(element, 250);
    expect(result.current.dropPos).toBeNull();

    act(() => captured.options?.onDropExit?.({ type: 'dropexit', x: 0, y: 0 }));
    expect(result.current.dropPos).toBeNull();
  });

  it.each([
    ['an unaccepted type', textItem('other', JSON.stringify({ id: 'x' }))],
    ['an empty payload', textItem('transaction', '  ')],
    ['malformed JSON', textItem('transaction', '{')],
    ['a payload without an id', textItem('transaction', '{}')],
    ['a payload with an empty id', textItem('transaction', '{"id":""}')],
    ['a null payload', textItem('transaction', 'null')],
  ])('ignores %s', async (_label, item) => {
    const { onDrop } = setup();

    await drop([item]);

    expect(onDrop).not.toHaveBeenCalled();
  });
});
