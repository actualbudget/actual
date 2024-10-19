// @ts-strict-ignore
import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { useMetadataPref } from '../hooks/useMetadataPref';
import { useModalState } from '../hooks/useModalState';
import { closeModal } from '../state/actions';

import { AccountAutocompleteModal } from './modals/AccountAutocompleteModal';
import { AccountMenuModal } from './modals/AccountMenuModal';
import { BudgetListModal } from './modals/BudgetListModal';
import { BudgetPageMenuModal } from './modals/BudgetPageMenuModal';
import { CategoryAutocompleteModal } from './modals/CategoryAutocompleteModal';
import { CategoryGroupMenuModal } from './modals/CategoryGroupMenuModal';
import { CategoryMenuModal } from './modals/CategoryMenuModal';
import { CloseAccountModal } from './modals/CloseAccountModal';
import { ConfirmCategoryDeleteModal } from './modals/ConfirmCategoryDeleteModal';
import { ConfirmTransactionDeleteModal } from './modals/ConfirmTransactionDeleteModal';
import { ConfirmTransactionEditModal } from './modals/ConfirmTransactionEditModal';
import { ConfirmUnlinkAccountModal } from './modals/ConfirmUnlinkAccountModal';
import { CoverModal } from './modals/CoverModal';
import { CreateAccountModal } from './modals/CreateAccountModal';
import { CreateEncryptionKeyModal } from './modals/CreateEncryptionKeyModal';
import { CreateLocalAccountModal } from './modals/CreateLocalAccountModal';
import { EditFieldModal } from './modals/EditFieldModal';
import { EditRuleModal } from './modals/EditRuleModal';
import { EnvelopeBalanceMenuModal } from './modals/EnvelopeBalanceMenuModal';
import { EnvelopeBudgetMenuModal } from './modals/EnvelopeBudgetMenuModal';
import { EnvelopeBudgetMonthMenuModal } from './modals/EnvelopeBudgetMonthMenuModal';
import { EnvelopeBudgetSummaryModal } from './modals/EnvelopeBudgetSummaryModal';
import { EnvelopeToBudgetMenuModal } from './modals/EnvelopeToBudgetMenuModal';
import { FixEncryptionKeyModal } from './modals/FixEncryptionKeyModal';
import { GoalTemplateModal } from './modals/GoalTemplateModal';
import { GoCardlessExternalMsgModal } from './modals/GoCardlessExternalMsgModal';
import { GoCardlessInitialiseModal } from './modals/GoCardlessInitialiseModal';
import { HoldBufferModal } from './modals/HoldBufferModal';
import { ImportTransactionsModal } from './modals/ImportTransactionsModal';
import { KeyboardShortcutModal } from './modals/KeyboardShortcutModal';
import { LoadBackupModal } from './modals/LoadBackupModal';
import { ConfirmChangeDocumentDirModal } from './modals/manager/ConfirmChangeDocumentDir';
import { DeleteFileModal } from './modals/manager/DeleteFileModal';
import { FilesSettingsModal } from './modals/manager/FilesSettingsModal';
import { ImportActualModal } from './modals/manager/ImportActualModal';
import { ImportModal } from './modals/manager/ImportModal';
import { ImportYNAB4Modal } from './modals/manager/ImportYNAB4Modal';
import { ImportYNAB5Modal } from './modals/manager/ImportYNAB5Modal';
import { ManageRulesModal } from './modals/ManageRulesModal';
import { MergeUnusedPayeesModal } from './modals/MergeUnusedPayeesModal';
import { NotesModal } from './modals/NotesModal';
import { OutOfSyncMigrationsModal } from './modals/OutOfSyncMigrationsModal';
import { PayeeAutocompleteModal } from './modals/PayeeAutocompleteModal';
import { ScheduledTransactionMenuModal } from './modals/ScheduledTransactionMenuModal';
import { SelectLinkedAccountsModal } from './modals/SelectLinkedAccountsModal';
import { SimpleFinInitialiseModal } from './modals/SimpleFinInitialiseModal';
import { SingleInputModal } from './modals/SingleInputModal';
import { TrackingBalanceMenuModal } from './modals/TrackingBalanceMenuModal';
import { TrackingBudgetMenuModal } from './modals/TrackingBudgetMenuModal';
import { TrackingBudgetMonthMenuModal } from './modals/TrackingBudgetMonthMenuModal';
import { TrackingBudgetSummaryModal } from './modals/TrackingBudgetSummaryModal';
import { TransferModal } from './modals/TransferModal';
import { DiscoverSchedules } from './schedules/DiscoverSchedules';
import { PostsOfflineNotification } from './schedules/PostsOfflineNotification';
import { ScheduleDetails } from './schedules/ScheduleDetails';
import { ScheduleLink } from './schedules/ScheduleLink';

export function Modals() {
  const location = useLocation();
  const dispatch = useDispatch();
  const { modalStack } = useModalState();
  const [budgetId] = useMetadataPref('id');

  useEffect(() => {
    if (modalStack.length > 0) {
      dispatch(closeModal());
    }
  }, [location]);

  const modals = modalStack
    .map(({ name, options }) => {
      switch (name) {
        case GoalTemplateModal.modalName:
          return budgetId ? (
            <GoalTemplateModal key={name} name={name} {...options} />
          ) : null;

        case KeyboardShortcutModal.modalName:
          // don't show the hotkey help modal when a budget is not open
          return budgetId ? (
            <KeyboardShortcutModal key={name} name={name} {...options} />
          ) : null;

        // Must be `case ImportTransactionsModal.modalName` once component is migrated to TS
        case 'import-transactions':
          return (
            <ImportTransactionsModal key={name} name={name} {...options} />
          );

        case CreateAccountModal.modalName:
          return <CreateAccountModal key={name} name={name} {...options} />;

        case CreateLocalAccountModal.modalName:
          return (
            <CreateLocalAccountModal key={name} name={name} {...options} />
          );

        case CloseAccountModal.modalName:
          return <CloseAccountModal key={name} name={name} {...options} />;

        // Must be `case SelectLinkedAccountsModal.modalName` once component is migrated to TS
        case 'select-linked-accounts':
          return (
            <SelectLinkedAccountsModal key={name} name={name} {...options} />
          );

        case ConfirmCategoryDeleteModal.modalName:
          return (
            <ConfirmCategoryDeleteModal key={name} name={name} {...options} />
          );

        case ConfirmUnlinkAccountModal.modalName:
          return (
            <ConfirmUnlinkAccountModal key={name} name={name} {...options} />
          );

        case ConfirmTransactionEditModal.modalName:
          return (
            <ConfirmTransactionEditModal key={name} name={name} {...options} />
          );

        case ConfirmTransactionDeleteModal.modalName:
          return (
            <ConfirmTransactionDeleteModal
              key={name}
              name={name}
              {...options}
            />
          );

        case LoadBackupModal.modalName:
          return <LoadBackupModal key={name} name={name} {...options} />;

        case ManageRulesModal.modalName:
          return <ManageRulesModal key={name} name={name} {...options} />;

        // Must be `case EditRuleModal.modalName` once component is migrated to TS
        case 'edit-rule':
          return <EditRuleModal key={name} name={name} {...options} />;

        // Must be `case MergeUnusedPayeesModal.modalName` once component is migrated to TS
        case 'merge-unused-payees':
          return <MergeUnusedPayeesModal key={name} name={name} {...options} />;

        case GoCardlessInitialiseModal.modalName:
          return (
            <GoCardlessInitialiseModal key={name} name={name} {...options} />
          );

        case SimpleFinInitialiseModal.modalName:
          return (
            <SimpleFinInitialiseModal key={name} name={name} {...options} />
          );

        case GoCardlessExternalMsgModal.modalName:
          return (
            <GoCardlessExternalMsgModal key={name} name={name} {...options} />
          );

        case CreateEncryptionKeyModal.modalName:
          return (
            <CreateEncryptionKeyModal key={name} name={name} {...options} />
          );

        case FixEncryptionKeyModal.modalName:
          return <FixEncryptionKeyModal key={name} name={name} {...options} />;

        // Must be `case EditFieldModal.modalName` once component is migrated to TS
        case 'edit-field':
          return <EditFieldModal key={name} name={name} {...options} />;

        case CategoryAutocompleteModal.modalName:
          return (
            <CategoryAutocompleteModal key={name} name={name} {...options} />
          );

        case AccountAutocompleteModal.modalName:
          return (
            <AccountAutocompleteModal key={name} name={name} {...options} />
          );

        case PayeeAutocompleteModal.modalName:
          return <PayeeAutocompleteModal key={name} name={name} {...options} />;

        // Create a new component for this modal
        case 'new-category':
          return <SingleInputModal key={name} name={name} {...options} />;

        // Create a new component for this modal
        case 'new-category-group':
          return <SingleInputModal key={name} name={name} {...options} />;

        case EnvelopeBudgetSummaryModal.modalName:
          return (
            <EnvelopeBudgetSummaryModal key={name} name={name} {...options} />
          );

        case TrackingBudgetSummaryModal.modalName:
          return (
            <TrackingBudgetSummaryModal key={name} name={name} {...options} />
          );

        // Must be `case ScheduleDetails.modalName` once component is migrated to TS
        case 'schedule-edit':
          return <ScheduleDetails key={name} name={name} {...options} />;

        case ScheduleLink.modalName:
          return <ScheduleLink key={name} name={name} {...options} />;

        case DiscoverSchedules.modalName:
          return <DiscoverSchedules key={name} name={name} {...options} />;

        // Must be `case PostsOfflineNotification.modalName` once component is migrated to TS
        case 'schedule-posts-offline-notification':
          return <PostsOfflineNotification key={name} name={name} />;

        case AccountMenuModal.modalName:
          return <AccountMenuModal key={name} name={name} {...options} />;

        case CategoryMenuModal.modalName:
          return <CategoryMenuModal key={name} name={name} {...options} />;

        case EnvelopeBudgetMenuModal.modalName:
          return (
            <EnvelopeBudgetMenuModal key={name} name={name} {...options} />
          );

        case TrackingBudgetMenuModal.modalName:
          return (
            <TrackingBudgetMenuModal key={name} name={name} {...options} />
          );

        case CategoryGroupMenuModal.modalName:
          return <CategoryGroupMenuModal key={name} name={name} {...options} />;

        case NotesModal.modalName:
          return <NotesModal key={name} name={name} {...options} />;

        case EnvelopeBalanceMenuModal.modalName:
          return (
            <EnvelopeBalanceMenuModal key={name} name={name} {...options} />
          );

        case EnvelopeToBudgetMenuModal.modalName:
          return (
            <EnvelopeToBudgetMenuModal key={name} name={name} {...options} />
          );

        case HoldBufferModal.modalName:
          return <HoldBufferModal key={name} name={name} {...options} />;

        case TrackingBalanceMenuModal.modalName:
          return (
            <TrackingBalanceMenuModal key={name} name={name} {...options} />
          );

        case TransferModal.modalName:
          return <TransferModal key={name} name={name} {...options} />;

        case CoverModal.modalName:
          return <CoverModal key={name} name={name} {...options} />;

        case ScheduledTransactionMenuModal.modalName:
          return (
            <ScheduledTransactionMenuModal
              key={name}
              name={name}
              {...options}
            />
          );

        case BudgetPageMenuModal.modalName:
          return <BudgetPageMenuModal key={name} name={name} {...options} />;

        case EnvelopeBudgetMonthMenuModal.modalName:
          return (
            <EnvelopeBudgetMonthMenuModal key={name} name={name} {...options} />
          );

        case TrackingBudgetMonthMenuModal.modalName:
          return (
            <TrackingBudgetMonthMenuModal key={name} name={name} {...options} />
          );

        case BudgetListModal.modalName:
          return <BudgetListModal key={name} name={name} {...options} />;
        case DeleteFileModal.modalName:
          return <DeleteFileModal key={name} name={name} {...options} />;
        case ImportModal.modalName:
          return <ImportModal key={name} name={name} />;
        case FilesSettingsModal.modalName:
          return <FilesSettingsModal key={name} name={name} {...options} />;
        case ConfirmChangeDocumentDirModal.modalName:
          return (
            <ConfirmChangeDocumentDirModal
              key={name}
              name={name}
              {...options}
            />
          );
        case ImportYNAB4Modal.modalName:
          return <ImportYNAB4Modal key={name} name={name} {...options} />;
        case ImportYNAB5Modal.modalName:
          return <ImportYNAB5Modal key={name} name={name} {...options} />;
        case ImportActualModal.modalName:
          return <ImportActualModal key={name} name={name} {...options} />;
        case OutOfSyncMigrationsModal.modalName:
          return (
            <OutOfSyncMigrationsModal key={name} name={name} {...options} />
          );

        default:
          throw new Error('Unknown modal');
      }
    })
    .map((modal, idx) => (
      <React.Fragment key={modalStack[idx].name}>{modal}</React.Fragment>
    ));

  // fragment needed per TS types
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{modals}</>;
}
