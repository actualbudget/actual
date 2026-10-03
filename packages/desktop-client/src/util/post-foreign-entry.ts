import { send } from '@actual-app/core/platform/client/connection';

import { pushModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import type { AppDispatch } from '#redux/store';

type EntryOptions = Pick<
  Extract<ModalType, { name: 'foreign-amount' }>['options'],
  'transaction' | 'currencyCode' | 'nativePrecision' | 'onPosted'
>;

/** Posts a new entry, opening the conversion dialog when input is needed. */
export async function postForeignEntry(
  dispatch: AppDispatch,
  options: EntryOptions,
): Promise<void> {
  const result = await send('transactions/post-foreign-entry', {
    transaction: options.transaction,
  });
  if (result.status === 'ok') {
    options.onPosted();
    return;
  }
  // The register can call this while rendering; defer opening the dialog.
  await Promise.resolve();
  dispatch(pushModal({ modal: { name: 'foreign-amount', options } }));
}
