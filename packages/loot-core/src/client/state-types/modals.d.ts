import type * as constants from '../constants';

// TODO: type this more throughly
type Modal = {
  name: string;
  options: unknown;
};

export type PushModalAction = {
  type: typeof constants.PUSH_MODAL;
  name: string;
  options: unknown;
};

export type ReplaceModalAction = {
  type: typeof constants.REPLACE_MODAL;
  name: string;
  options: unknown;
};

export type PopModalAction = {
  type: typeof constants.POP_MODAL;
};

export type CloseModalAction = {
  type: typeof constants.CLOSE_MODAL;
};

export type ModalsActions =
  | PushModalAction
  | ReplaceModalAction
  | PopModalAction
  | CloseModalAction;

export type ModalsState = {
  modalStack: Modal[];
  isHidden: boolean;
};
