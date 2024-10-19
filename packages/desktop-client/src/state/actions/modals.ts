import { type ElementType, type ComponentPropsWithoutRef } from 'react';

import { type EmptyObject } from 'loot-core/types/util';

import { type AccountAutocompleteModal } from '../../components/modals/AccountAutocompleteModal';
import { type AccountMenuModal } from '../../components/modals/AccountMenuModal';
import { type BudgetListModal } from '../../components/modals/BudgetListModal';
import { type BudgetPageMenuModal } from '../../components/modals/BudgetPageMenuModal';
import { type CategoryAutocompleteModal } from '../../components/modals/CategoryAutocompleteModal';
import { type CategoryGroupMenuModal } from '../../components/modals/CategoryGroupMenuModal';
import { type CategoryMenuModal } from '../../components/modals/CategoryMenuModal';
import { type CloseAccountModal } from '../../components/modals/CloseAccountModal';
import { type ConfirmCategoryDeleteModal } from '../../components/modals/ConfirmCategoryDeleteModal';
import { type ConfirmTransactionDeleteModal } from '../../components/modals/ConfirmTransactionDeleteModal';
import { type ConfirmTransactionEditModal } from '../../components/modals/ConfirmTransactionEditModal';
import { type ConfirmUnlinkAccountModal } from '../../components/modals/ConfirmUnlinkAccountModal';
import { type CoverModal } from '../../components/modals/CoverModal';
import { type CreateAccountModal } from '../../components/modals/CreateAccountModal';
import { type CreateEncryptionKeyModal } from '../../components/modals/CreateEncryptionKeyModal';
import { type CreateLocalAccountModal } from '../../components/modals/CreateLocalAccountModal';
import { type EditFieldModal } from '../../components/modals/EditFieldModal';
import { type EditRuleModal } from '../../components/modals/EditRuleModal';
import { type EnvelopeBalanceMenuModal } from '../../components/modals/EnvelopeBalanceMenuModal';
import { type EnvelopeBudgetMenuModal } from '../../components/modals/EnvelopeBudgetMenuModal';
import { type EnvelopeBudgetMonthMenuModal } from '../../components/modals/EnvelopeBudgetMonthMenuModal';
import { type EnvelopeBudgetSummaryModal } from '../../components/modals/EnvelopeBudgetSummaryModal';
import { type EnvelopeToBudgetMenuModal } from '../../components/modals/EnvelopeToBudgetMenuModal';
import { type FixEncryptionKeyModal } from '../../components/modals/FixEncryptionKeyModal';
import { type GoalTemplateModal } from '../../components/modals/GoalTemplateModal';
import { type GoCardlessExternalMsgModal } from '../../components/modals/GoCardlessExternalMsgModal';
import { type GoCardlessInitialiseModal } from '../../components/modals/GoCardlessInitialiseModal';
import { type HoldBufferModal } from '../../components/modals/HoldBufferModal';
import { type ImportTransactionsModal } from '../../components/modals/ImportTransactionsModal';
import { type KeyboardShortcutModal } from '../../components/modals/KeyboardShortcutModal';
import { type LoadBackupModal } from '../../components/modals/LoadBackupModal';
import { type ConfirmChangeDocumentDirModal } from '../../components/modals/manager/ConfirmChangeDocumentDir';
import { type DeleteFileModal } from '../../components/modals/manager/DeleteFileModal';
import { type FilesSettingsModal } from '../../components/modals/manager/FilesSettingsModal';
import { type ImportActualModal } from '../../components/modals/manager/ImportActualModal';
import { type ImportModal } from '../../components/modals/manager/ImportModal';
import { type ImportYNAB4Modal } from '../../components/modals/manager/ImportYNAB4Modal';
import { type ImportYNAB5Modal } from '../../components/modals/manager/ImportYNAB5Modal';
import { type ManageRulesModal } from '../../components/modals/ManageRulesModal';
import { type MergeUnusedPayeesModal } from '../../components/modals/MergeUnusedPayeesModal';
import { type NotesModal } from '../../components/modals/NotesModal';
import { type OutOfSyncMigrationsModal } from '../../components/modals/OutOfSyncMigrationsModal';
import { type PayeeAutocompleteModal } from '../../components/modals/PayeeAutocompleteModal';
import { type ScheduledTransactionMenuModal } from '../../components/modals/ScheduledTransactionMenuModal';
import { type SelectLinkedAccountsModal } from '../../components/modals/SelectLinkedAccountsModal';
import { type SimpleFinInitialiseModal } from '../../components/modals/SimpleFinInitialiseModal';
import { type SingleInputModal } from '../../components/modals/SingleInputModal';
import { type TrackingBalanceMenuModal } from '../../components/modals/TrackingBalanceMenuModal';
import { type TrackingBudgetMenuModal } from '../../components/modals/TrackingBudgetMenuModal';
import { type TrackingBudgetMonthMenuModal } from '../../components/modals/TrackingBudgetMonthMenuModal';
import { type TrackingBudgetSummaryModal } from '../../components/modals/TrackingBudgetSummaryModal';
import { type TransferModal } from '../../components/modals/TransferModal';
import { type DiscoverSchedules } from '../../components/schedules/DiscoverSchedules';
import { type PostsOfflineNotification } from '../../components/schedules/PostsOfflineNotification';
import { type ScheduleDetails } from '../../components/schedules/ScheduleDetails';
import { type ScheduleLink } from '../../components/schedules/ScheduleLink';
import * as constants from '../constants';

/**
 * This requires modal components to have a static property `modalName` that is a string.
 * This `modalName` should be a const and contain a unique name for the modal.
 */
type ModalRegistration<
  T extends ElementType & {
    modalName: string;
  },
> = {
  name: T['modalName'];
  options: Omit<ComponentPropsWithoutRef<T>, 'name'>;
};

type NamedModalRegistration<N, T extends ElementType> = {
  name: N;
  options: Omit<ComponentPropsWithoutRef<T>, 'name'>;
};

/**
 * This is a more generic version of `ModalRegistration` that does not require the `modalName` static property.
 * This should only used for jsx modal components that are not yet migrated to TypeScript.
 */
type JsxModalRegistration<S, T extends ElementType> = {
  name: S;
  options: Omit<ComponentPropsWithoutRef<T>, 'name'>;
};

type ImportTransactionsModalRegistration = JsxModalRegistration<
  'import-transactions',
  typeof ImportTransactionsModal
>;
type AddAccountModalRegistration = ModalRegistration<typeof CreateAccountModal>;
type AddLocalAccountModalRegistration = ModalRegistration<
  typeof CreateLocalAccountModal
>;
type CloseAccountModalRegistration = ModalRegistration<
  typeof CloseAccountModal
>;
type SelectLinkedAccountsModalRegistration = JsxModalRegistration<
  'select-linked-accounts',
  typeof SelectLinkedAccountsModal
>;
type ConfirmCategoryDeleteModalRegistration = ModalRegistration<
  typeof ConfirmCategoryDeleteModal
>;
type LoadBackupModalRegistration = ModalRegistration<typeof LoadBackupModal>;
type ManageRulesModalRegistration = ModalRegistration<typeof ManageRulesModal>;
type EditRuleModalRegistration = JsxModalRegistration<
  'edit-rule',
  typeof EditRuleModal
>;
type MergeUnusedPayeesModalRegistration = JsxModalRegistration<
  'merge-unused-payees',
  typeof MergeUnusedPayeesModal
>;
type GoCardlessInitModalRegistration = ModalRegistration<
  typeof GoCardlessInitialiseModal
>;
type SimplefinInitModalRegistration = ModalRegistration<
  typeof SimpleFinInitialiseModal
>;
type GoCardlessExternalMsgModalRegistration = ModalRegistration<
  typeof GoCardlessExternalMsgModal
>;
type DeleteBudgetModalRegistration = ModalRegistration<typeof DeleteFileModal>;
type ImportModalRegistration = ModalRegistration<typeof ImportModal>;
type ImportYnab4ModalRegistration = ModalRegistration<typeof ImportYNAB4Modal>;
type ImportYnab5ModalRegistration = ModalRegistration<typeof ImportYNAB5Modal>;
type ImportActualModalRegistration = ModalRegistration<
  typeof ImportActualModal
>;
type OutOfSyncMigrationsModalRegistration = ModalRegistration<
  typeof OutOfSyncMigrationsModal
>;
type FilesSettingsModalRegistration = ModalRegistration<
  typeof FilesSettingsModal
>;
type ConfirmChangeDocumentDirModalRegistration = ModalRegistration<
  typeof ConfirmChangeDocumentDirModal
>;
type CreateEncryptionKeyModalRegistration = ModalRegistration<
  typeof CreateEncryptionKeyModal
>;
type FixEncryptionKeyModalRegistration = ModalRegistration<
  typeof FixEncryptionKeyModal
>;
type EditFieldModalRegistration = JsxModalRegistration<
  'edit-field',
  typeof EditFieldModal
>;
type CategoryAutocompleteModalRegistration = ModalRegistration<
  typeof CategoryAutocompleteModal
>;
type AccountAutocompleteModalRegistration = ModalRegistration<
  typeof AccountAutocompleteModal
>;
type PayeeAutocompleteModalRegistration = ModalRegistration<
  typeof PayeeAutocompleteModal
>;
type ScheduleDetailsModalRegistration = JsxModalRegistration<
  'schedule-edit',
  typeof ScheduleDetails
>;
type ScheduleLinkModalRegistration = ModalRegistration<typeof ScheduleLink>;
type DiscoverSchedulesModalRegistration = ModalRegistration<
  typeof DiscoverSchedules
>;
type PostsOfflineNotificationModalRegistration = JsxModalRegistration<
  'schedule-posts-offline-notification',
  typeof PostsOfflineNotification
>;
type AccountMenuModalRegistration = ModalRegistration<typeof AccountMenuModal>;
type CategoryMenuModalRegistration = ModalRegistration<
  typeof CategoryMenuModal
>;
type EnvelopeBudgetMenuModalRegistration = ModalRegistration<
  typeof EnvelopeBudgetMenuModal
>;
type TrackingBudgetMenuModalRegistration = ModalRegistration<
  typeof TrackingBudgetMenuModal
>;
type CategoryGroupMenuModalRegistration = ModalRegistration<
  typeof CategoryGroupMenuModal
>;
type NotesModalRegistration = ModalRegistration<typeof NotesModal>;
type TrackingBudgetSummaryModalRegistration = ModalRegistration<
  typeof TrackingBudgetSummaryModal
>;
type EnvelopeBudgetSummaryModalRegistration = ModalRegistration<
  typeof EnvelopeBudgetSummaryModal
>;

type NewCategoryGroupModalRegistration = NamedModalRegistration<
  'new-category-group',
  typeof SingleInputModal
>;
type NewCategoryModal = NamedModalRegistration<
  'new-category',
  typeof SingleInputModal
>;
type EnvelopeBalanceMenuModalRegistration = ModalRegistration<
  typeof EnvelopeBalanceMenuModal
>;
type EnvelopeToBudgetMenuModalRegistration = ModalRegistration<
  typeof EnvelopeToBudgetMenuModal
>;
type TrackingBalanceMenuModalRegistration = ModalRegistration<
  typeof TrackingBalanceMenuModal
>;
type TransferModalRegistration = ModalRegistration<typeof TransferModal>;
type CoverModalRegistration = ModalRegistration<typeof CoverModal>;
type HoldBufferModalRegistration = ModalRegistration<typeof HoldBufferModal>;
type ScheduledTransactionMenuModalRegistration = ModalRegistration<
  typeof ScheduledTransactionMenuModal
>;
type BudgetPageMenuModalRegistration = ModalRegistration<
  typeof BudgetPageMenuModal
>;
type EnvelopeBudgetMonthMenuModalRegistration = ModalRegistration<
  typeof EnvelopeBudgetMonthMenuModal
>;
type TrackingBudgetMonthMenuModalRegistration = ModalRegistration<
  typeof TrackingBudgetMonthMenuModal
>;
type BudgetListModalRegistration = ModalRegistration<typeof BudgetListModal>;
type ConfirmTransactionEditModalRegistration = ModalRegistration<
  typeof ConfirmTransactionEditModal
>;
type ConfirmTransactionDeleteModalRegistration = ModalRegistration<
  typeof ConfirmTransactionDeleteModal
>;
type ConfirmUnlinkAccountModalRegistration = ModalRegistration<
  typeof ConfirmUnlinkAccountModal
>;
type KeyboardShortcutsModalRegistration = ModalRegistration<
  typeof KeyboardShortcutModal
>;
type GoalTemplateModalRegistration = ModalRegistration<
  typeof GoalTemplateModal
>;

export type Modal =
  | ImportTransactionsModalRegistration
  | AddAccountModalRegistration
  | AddLocalAccountModalRegistration
  | CloseAccountModalRegistration
  | SelectLinkedAccountsModalRegistration
  | ConfirmCategoryDeleteModalRegistration
  | LoadBackupModalRegistration
  | ManageRulesModalRegistration
  | EditRuleModalRegistration
  | MergeUnusedPayeesModalRegistration
  | GoCardlessInitModalRegistration
  | SimplefinInitModalRegistration
  | GoCardlessExternalMsgModalRegistration
  | DeleteBudgetModalRegistration
  | ImportModalRegistration
  | ImportYnab4ModalRegistration
  | ImportYnab5ModalRegistration
  | ImportActualModalRegistration
  | OutOfSyncMigrationsModalRegistration
  | FilesSettingsModalRegistration
  | ConfirmChangeDocumentDirModalRegistration
  | CreateEncryptionKeyModalRegistration
  | FixEncryptionKeyModalRegistration
  | EditFieldModalRegistration
  | CategoryAutocompleteModalRegistration
  | AccountAutocompleteModalRegistration
  | PayeeAutocompleteModalRegistration
  | ScheduleDetailsModalRegistration
  | ScheduleLinkModalRegistration
  | DiscoverSchedulesModalRegistration
  | PostsOfflineNotificationModalRegistration
  | AccountMenuModalRegistration
  | CategoryMenuModalRegistration
  | EnvelopeBudgetMenuModalRegistration
  | TrackingBudgetMenuModalRegistration
  | CategoryGroupMenuModalRegistration
  | NotesModalRegistration
  | TrackingBudgetSummaryModalRegistration
  | EnvelopeBudgetSummaryModalRegistration
  | NewCategoryGroupModalRegistration
  | NewCategoryModal
  | EnvelopeBalanceMenuModalRegistration
  | EnvelopeToBudgetMenuModalRegistration
  | TrackingBalanceMenuModalRegistration
  | TransferModalRegistration
  | CoverModalRegistration
  | HoldBufferModalRegistration
  | ScheduledTransactionMenuModalRegistration
  | BudgetPageMenuModalRegistration
  | EnvelopeBudgetMonthMenuModalRegistration
  | TrackingBudgetMonthMenuModalRegistration
  | BudgetListModalRegistration
  | ConfirmTransactionEditModalRegistration
  | ConfirmTransactionDeleteModalRegistration
  | ConfirmUnlinkAccountModalRegistration
  | KeyboardShortcutsModalRegistration
  | GoalTemplateModalRegistration;

export type PushModalAction = {
  type: typeof constants.PUSH_MODAL;
  modal: Modal;
};

export type ReplaceModalAction = {
  type: typeof constants.REPLACE_MODAL;
  modal: Modal;
};

export type PopModalAction = {
  type: typeof constants.POP_MODAL;
};

export type CloseModalAction = {
  type: typeof constants.CLOSE_MODAL;
};

export type CollapseModalsAction = {
  type: typeof constants.COLLAPSE_MODALS;
  rootModalName: string;
};

export type ModalsActions =
  | PushModalAction
  | ReplaceModalAction
  | PopModalAction
  | CloseModalAction
  | CollapseModalsAction;

export function pushModal<M extends Modal['name']>(
  name: M,
  options?: Extract<Modal, { name: M }>['options'],
): PushModalAction {
  const modal: Modal = { name, options } as Modal;
  return { type: constants.PUSH_MODAL, modal };
}

export function replaceModal<M extends Modal['name']>(
  name: M,
  options?: Extract<Modal, { name: M }>['options'],
): ReplaceModalAction {
  const modal: Modal = { name, options } as Modal;
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
