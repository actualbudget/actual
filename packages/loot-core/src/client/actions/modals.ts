import * as constants from '../constants';
import type {
  OptionlessModal,
  CloseModalAction,
  PopModalAction,
  PushModalAction,
  ReplaceModalAction,
  ModalWithOptions,
  ModalType,
  FinanceModals,
  Modal,
} from '../state-types/modals';

export function pushModal<M extends keyof ModalWithOptions>(
  name: M,
  options: ModalWithOptions[M],
): PushModalAction;
export function pushModal(name: OptionlessModal): PushModalAction;
export function pushModal<M extends ModalType>(
  name: M,
  options?: FinanceModals[M],
): PushModalAction;
export function pushModal<M extends ModalType>(
  name: M,
  options?: FinanceModals[M],
): PushModalAction {
  const modal = { name, options };
  return { type: constants.PUSH_MODAL, modal };
}

export function replaceModal<M extends keyof ModalWithOptions>(
  name: M,
  options: ModalWithOptions[M],
): ReplaceModalAction;
export function replaceModal(name: OptionlessModal): ReplaceModalAction;
export function replaceModal<M extends ModalType>(
  name: M,
  options?: FinanceModals[M],
): ReplaceModalAction {
  const modal: Modal = { name, options };
  return { type: constants.REPLACE_MODAL, modal };
}

export function popModal(): PopModalAction {
  return { type: constants.POP_MODAL };
}

export function closeModal(): CloseModalAction {
  return { type: constants.CLOSE_MODAL };
}

export function collapseModals(rootModalName: string) {
  return { type: constants.COLLAPSE_MODALS, rootModalName };
}
