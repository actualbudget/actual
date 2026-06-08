import type { Falsy } from '@actual-app/core/types/util';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import _ from 'lodash';

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
    addItems(state, action: PayloadAction<Falsy<ContextMenuItem>[]>) {
      for (const item of action.payload) {
        if (!item) continue;
        // always add menu lines
        if (typeof item === 'symbol') {
          state.items.push(item);
          continue;
        }

        // only add other items if the provided name is unique
        const isAlreadyPresent = state.items.some(
          i => typeof i === 'object' && i.name === item.name,
        );
        if (!item.hidden && !isAlreadyPresent) {
          state.items.push(item);
        }
      }
    },
    openContextMenu(
      state,
      action: PayloadAction<{
        position: { x: number; y: number };
      }>,
    ) {
      state.isOpen = true;
      state.position = action.payload.position;
      state.items = _.orderBy(
        state.items,
        item => (typeof item === 'object' && item.order) || 0,
        'asc',
      );
    },
    closeContextMenu(state) {
      state.isOpen = false;
      state.items = [];
    },
  },
});

export const { name, reducer, getInitialState } = contextMenuSlice;
export const { openContextMenu, closeContextMenu, addItems } =
  contextMenuSlice.actions;
