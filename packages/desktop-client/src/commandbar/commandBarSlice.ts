import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

const sliceName = 'commandBar';

type CommandBarState = {
  open: boolean;
};

const initialState: CommandBarState = {
  open: false,
};

const commandBarSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    openCommandBar(state) {
      state.open = true;
    },
    closeCommandBar(state) {
      state.open = false;
    },
    setCommandBarOpen(state, action: PayloadAction<boolean>) {
      state.open = action.payload;
    },
  },
});

export const { name, reducer, getInitialState } = commandBarSlice;
export const { openCommandBar, closeCommandBar, setCommandBarOpen } =
  commandBarSlice.actions;
