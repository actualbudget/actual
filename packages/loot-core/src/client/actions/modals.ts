import * as constants from '../constants';
import type {
  CloseModalAction,
  Modal,
  PopModalAction,
  PushModalAction,
  ReplaceModalAction,
} from '../state-types/modals';

export function pushModal<M extends Modal>(
  name: M['name'],
  options: M['options'],
): PushModalAction {
  // @ts-expect-error TS is unable to determine that `name` and `options` match
  let modal: M = { name, options };
  return { type: constants.PUSH_MODAL, modal };
}

export function replaceModal<M extends Modal>(
  name: M['name'],
  options: M['options'],
): ReplaceModalAction {
  // @ts-expect-error TS is unable to determine that `name` and `options` match
  let modal: M = { name, options };
  return { type: constants.REPLACE_MODAL, modal };
}

export function popModal(): PopModalAction {
  return { type: constants.POP_MODAL };
}

export function closeModal(): CloseModalAction {
  return { type: constants.CLOSE_MODAL };
}
