import { send } from '../../platform/client/fetch';
import { type AccountEntity } from '../../types/models';
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
import { type AppDispatch, type GetRootState } from '../store';

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

export function openAccountCloseModal(accountId: AccountEntity['id']) {
  return async (dispatch: AppDispatch, getState: GetRootState) => {
    const {
      balance,
      numTransactions,
    }: { balance: number; numTransactions: number } = await send(
      'account-properties',
      {
        id: accountId,
      },
    );
    const account = getState().queries.accounts.find(
      acct => acct.id === accountId,
    );

    dispatch(
      pushModal('close-account' as ModalType, {
        account,
        balance,
        canDelete: numTransactions === 0,
      }),
    );
  };
}
