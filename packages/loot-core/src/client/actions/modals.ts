import * as constants from '../constants';
import type { Modal } from '../state-types/modals';

import type { ActionResult } from './types';

export function pushModal<M extends Modal>(
  name: M['name'],
  options: M['options'] = {},
): ActionResult {
  // @ts-expect-error TS is unable to determine that `name` and `options` match
  let modal: M = { name, options };
  return { type: constants.PUSH_MODAL, modal };
}

export function replaceModal<M extends Modal>(
  name: M['name'],
  options: M['options'],
): ActionResult {
  // @ts-expect-error TS is unable to determine that `name` and `options` match
  let modal: M = { name, options };
  return { type: constants.REPLACE_MODAL, modal };
}

export function popModal(): ActionResult {
  return { type: constants.POP_MODAL };
}

export function closeModal(): ActionResult {
  return { type: constants.CLOSE_MODAL };
}
