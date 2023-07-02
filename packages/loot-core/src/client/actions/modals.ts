import * as constants from '../constants';

import type { ActionResult } from './types';

export function pushModal(name: string, options: unknown): ActionResult {
  return { type: constants.PUSH_MODAL, name, options };
}

export function replaceModal(name: string, options: unknown): ActionResult {
  return { type: constants.REPLACE_MODAL, name, options };
}

export function popModal(): ActionResult {
  return { type: constants.POP_MODAL };
}

export function closeModal(): ActionResult {
  return { type: constants.CLOSE_MODAL };
}
