import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { ContextMenuItem } from './types';

const sliceName = 'contextMenu';

export type ContextMenuHoverTrigger = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type ContextMenuState = {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  /**
   * Screen rectangle of the control that opened the menu by hovering, or
   * `null` when the menu was opened explicitly (click / right-click). A
   * hover-opened menu closes again once the pointer leaves both this
   * rectangle and the menu itself.
   */
  hoverTrigger: ContextMenuHoverTrigger | null;
};

const initialState: ContextMenuState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  items: [],
  hoverTrigger: null,
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
    setContextMenuHoverTrigger(
      state,
      action: PayloadAction<ContextMenuHoverTrigger | null>,
    ) {
      state.hoverTrigger = action.payload;
    },
    closeContextMenu(state) {
      state.isOpen = false;
      state.items = [];
      state.hoverTrigger = null;
    },
  },
});

export const { name, reducer, getInitialState } = contextMenuSlice;
export const {
  setContextMenuPosition,
  setContextMenuHoverTrigger,
  closeContextMenu,
  addItems,
} = contextMenuSlice.actions;
