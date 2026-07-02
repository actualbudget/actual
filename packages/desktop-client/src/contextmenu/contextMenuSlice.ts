import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { ContextMenuItem } from './types';

const sliceName = 'contextMenu';

type ContextMenuState = {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
};

const initialState: ContextMenuState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  items: [],
};

const contextMenuSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    addItems(state, action: PayloadAction<ContextMenuItem[]>) {
      for (const item of action.payload) {
        if (typeof item === 'symbol' || !item.hidden) {
          state.items.push(item);
        }
      }

      state.items.sort((a, b) => {
        const orderA = typeof a === 'object' ? (a.order ?? 0) : 0;
        const orderB = typeof b === 'object' ? (b.order ?? 0) : 0;
        return orderA - orderB;
      });
      state.isOpen = !!state.items.length;
    },
    setContextMenuPosition(
      state,
      action: PayloadAction<{
        x: number;
        y: number;
      }>,
    ) {
      state.position = action.payload;
    },
    closeContextMenu(state) {
      state.isOpen = false;
      state.items = [];
    },
  },
});

export const { name, reducer, getInitialState } = contextMenuSlice;
export const { setContextMenuPosition, closeContextMenu, addItems } =
  contextMenuSlice.actions;
