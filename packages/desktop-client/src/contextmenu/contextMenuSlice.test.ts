import {
  addItems,
  closeContextMenu,
  getInitialState,
  setContextMenuPosition,
  reducer,
} from './contextMenuSlice';
import type { ContextMenuItem } from './types';

describe('contextMenuSlice', () => {
  it('should return initial state', () => {
    expect(getInitialState()).toEqual({
      isOpen: false,
      position: { x: 0, y: 0 },
      items: [],
    });
  });

  describe('addItems', () => {
    it('should add items to the state', () => {
      const initialState = getInitialState();
      const items: ContextMenuItem[] = [
        { name: 'test1', text: 'Test 1', onClick: () => {} },
        { name: 'test2', text: 'Test 2', onClick: () => {} },
      ];

      const state = reducer(initialState, addItems(items));
      expect(state.items).toHaveLength(2);
      expect((state.items[0] as any).name).toBe('test1');
      expect((state.items[1] as any).name).toBe('test2');
    });

    it('should not add hidden items', () => {
      const initialState = getInitialState();
      const items: ContextMenuItem[] = [
        { name: 'test1', text: 'Test 1', onClick: () => {}, hidden: true },
        { name: 'test2', text: 'Test 2', onClick: () => {}, hidden: false },
      ];

      const state = reducer(initialState, addItems(items));
      expect(state.items).toHaveLength(1);
      expect((state.items[0] as any).name).toBe('test2');
    });

    it('should add symbols (Menu.line) regardless of duplicates', () => {
      const initialState = getInitialState();
      const lineSymbol = Symbol('line');

      const items: ContextMenuItem[] = [
        lineSymbol as unknown as ContextMenuItem,
        lineSymbol as unknown as ContextMenuItem,
      ];

      const state = reducer(initialState, addItems(items));
      expect(state.items).toHaveLength(2);
      expect(state.items[0]).toBe(lineSymbol);
      expect(state.items[1]).toBe(lineSymbol);
    });
  });

  describe('setContextMenuPosition', () => {
    it('should update position without changing isOpen', () => {
      const initialState = getInitialState();
      const position = { x: 100, y: 200 };

      const state = reducer(initialState, setContextMenuPosition(position));
      expect(state.position).toEqual(position);
      expect(state.isOpen).toBe(false);
    });

    it('should sort items by order', () => {
      const initialState = getInitialState();
      const items: ContextMenuItem[] = [
        { name: 'test1', text: 'Test 1', onClick: () => {}, order: 2 },
        { name: 'test2', text: 'Test 2', onClick: () => {}, order: 1 },
        { name: 'test3', text: 'Test 3', onClick: () => {} }, // defaults to 0
      ];

      let state = reducer(initialState, addItems(items));
      state = reducer(state, setContextMenuPosition({ x: 0, y: 0 }));

      expect(state.items).toHaveLength(3);
      expect((state.items[0] as any).name).toBe('test3'); // order 0
      expect((state.items[1] as any).name).toBe('test2'); // order 1
      expect((state.items[2] as any).name).toBe('test1'); // order 2
    });
  });

  describe('closeContextMenu', () => {
    it('should set isOpen to false and clear items', () => {
      let state = getInitialState();
      state = reducer(
        state,
        addItems([{ name: 'test1', text: 'Test 1', onClick: () => {} }]),
      );
      state = reducer(
        state,
        setContextMenuPosition({ position: { x: 10, y: 10 } }),
      );

      expect(state.isOpen).toBe(true);
      expect(state.items).toHaveLength(1);

      state = reducer(state, closeContextMenu());
      expect(state.isOpen).toBe(false);
      expect(state.items).toHaveLength(0);
    });
  });
});
