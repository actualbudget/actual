import * as constants from '../constants';
import type {
  CloseModalAction,
  PopModalAction,
  PushModalAction,
  ReplaceModalAction,
  FinanceModals,
} from '../state-types/modals';

export function pushModal<M extends keyof FinanceModals>(
  name: M,
  options?: FinanceModals[M],
): PushModalAction {
  const modal = { name, options };
  return { type: constants.PUSH_MODAL, modal };
}

export function replaceModal<M extends keyof FinanceModals>(
  name: M,
  options?: FinanceModals[M],
): ReplaceModalAction {
  const modal = { name, options };
  return { type: constants.REPLACE_MODAL, modal };
}

export function popModal(): PopModalAction {
  return { type: constants.POP_MODAL };
}

export function closeModal(): CloseModalAction {
  return { type: constants.CLOSE_MODAL };
}
