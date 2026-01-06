import React, { useState, useMemo, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading, Button } from '@actual-app/components/button';
import { SvgAlertTriangle } from '@actual-app/components/icons/v2';
import { Paragraph } from '@actual-app/components/paragraph';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import {
  parseWallosFile,
  toRecurConfig,
  type ParsedWallosSubscription,
} from 'loot-core/server/importers/wallos';
import { format as monthUtilFormat } from 'loot-core/shared/months';
import { getRecurringDescription } from 'loot-core/shared/schedules';

import { ROW_HEIGHT } from './SchedulesTable';

import { AccountAutocomplete } from '@desktop-client/components/autocomplete/AccountAutocomplete';
import { PayeeAutocomplete } from '@desktop-client/components/autocomplete/PayeeAutocomplete';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import {
  Table,
  TableHeader,
  Row,
  Field,
  Cell,
  SelectCell,
} from '@desktop-client/components/table';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { usePayees } from '@desktop-client/hooks/usePayees';
import {
  useSelected,
  useSelectedDispatch,
  useSelectedItems,
  SelectedProvider,
} from '@desktop-client/hooks/useSelected';
import { createPayee } from '@desktop-client/payees/payeesSlice';
import { useDispatch } from '@desktop-client/redux';

/**
 * Represents a Wallos subscription with UI state for import.
 * Extends ParsedWallosSubscription with fields for tracking user selections
 * and duplicate detection status during the import workflow.
 */
type ImportedSubscription = ParsedWallosSubscription & {
  /** The account selected for this subscription */
  selectedAccountId: string | null;
  /** The payee selected/matched for this subscription */
  selectedPayeeId: string | null;
  /** Name to use for creating a new payee if no existing payee matched */
  matchedPayeeName: string | null;
  /** Whether a potential duplicate schedule exists */
  isDuplicate: boolean;
};

/**
 * Props for the ImportWallosTable component.
 */
type ImportWallosTableProps = {
  /** Array of subscriptions to display */
  subscriptions: ImportedSubscription[];
  /** Callback when account selection changes */
  onAccountChange: (subId: string, accountId: string | null) => void;
  /** Callback when payee selection changes */
  onPayeeChange: (
    subId: string,
    payeeId: string | null,
    payeeName: string | null,
  ) => void;
};

/**
 * Table component for displaying and selecting Wallos subscriptions to import.
 *
 * Features:
 * - Multi-select with checkboxes
 * - Per-row account and payee selection
 * - Duplicate warning indicators
 * - Recurrence and amount display
 * - Highlights rows missing required account selection
 */
function ImportWallosTable({
  subscriptions,
  onAccountChange,
  onPayeeChange,
}: ImportWallosTableProps) {
  const { t } = useTranslation();
  const selectedItems = useSelectedItems();
  const dispatchSelected = useSelectedDispatch();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const locale = useLocale();
  const format = useFormat();

  function renderItem({ item }: { item: ImportedSubscription }) {
    const selected = selectedItems.has(item.id);
    const recurDescription = getRecurringDescription(
      toRecurConfig(item),
      dateFormat,
      locale,
    );

    return (
      <Row
        height={ROW_HEIGHT}
        inset={15}
        onClick={e => {
          dispatchSelected({
            type: 'select',
            id: item.id,
            isRangeSelect: e.shiftKey,
          });
        }}
        style={{
          borderColor: selected ? theme.tableBorderSelected : theme.tableBorder,
          cursor: 'pointer',
          color: selected
            ? theme.tableRowBackgroundHighlightText
            : theme.tableText,
          backgroundColor: selected
            ? theme.tableRowBackgroundHighlight
            : theme.tableBackground,
          ':hover': {
            backgroundColor: theme.tableRowBackgroundHover,
            color: theme.tableText,
          },
        }}
      >
        <SelectCell
          exposed
          focused={false}
          selected={selected}
          onSelect={e => {
            dispatchSelected({
              type: 'select',
              id: item.id,
              isRangeSelect: e.shiftKey,
            });
          }}
        />
        <Field
          width={150}
          title={[
            item.paymentMethod && `Payment Method: ${item.paymentMethod}`,
            item.notes && `Notes: ${item.notes}`,
          ]
            .filter(Boolean)
            .join('\n')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {selected && item.isDuplicate && (
              <Tooltip content={t('Potential duplicate schedule')}>
                <SvgAlertTriangle
                  style={{
                    width: 16,
                    height: 16,
                    color: theme.warningText,
                    flexShrink: 0,
                  }}
                />
              </Tooltip>
            )}
            <Text style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.name}
            </Text>
          </View>
        </Field>
        <Cell
          width={150}
          style={{
            padding: '5px',
            border:
              selected && !item.selectedAccountId
                ? `1px solid ${theme.warningBorder}`
                : '',
            borderRadius: 4,
          }}
          name="account"
          plain
          onClick={e => e.stopPropagation()}
        >
          <AccountAutocomplete
            value={item.selectedAccountId}
            includeClosedAccounts={false}
            onSelect={(accountId: string) =>
              onAccountChange(item.id, accountId)
            }
          />
        </Cell>
        <Cell
          width={150}
          style={{ padding: '5px' }}
          name="payee"
          plain
          onClick={e => e.stopPropagation()}
        >
          <PayeeAutocomplete
            value={item.selectedPayeeId}
            clearOnBlur
            showMakeTransfer={false}
            inputProps={{
              placeholder: item.name,
            }}
            onSelect={(payeeId: string) =>
              onPayeeChange(item.id, payeeId, null)
            }
          />
        </Cell>
        <Field width="auto" title={recurDescription} style={{ flex: 1 }}>
          {recurDescription}
        </Field>
        <Field width={90}>
          {monthUtilFormat(item.nextPaymentDate, dateFormat)}
        </Field>
        <Cell
          width={80}
          plain
          style={{
            textAlign: 'right',
            padding: '0 5px',
            ...styles.tnum,
          }}
          name="amount"
        >
          <Text
            style={{
              color: item.amount > 0 ? theme.noticeTextLight : theme.tableText,
              ...styles.smallText,
            }}
          >
            {format(Math.abs(item.amount), 'financial')}
          </Text>
        </Cell>
      </Row>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <TableHeader height={ROW_HEIGHT} inset={15}>
        <SelectCell
          exposed
          focused={false}
          selected={selectedItems.size > 0}
          onSelect={e =>
            dispatchSelected({ type: 'select-all', isRangeSelect: e.shiftKey })
          }
        />
        <Field width={150}>
          <Trans>Name</Trans>
        </Field>
        <Field width={150}>
          <Trans>Account</Trans>
        </Field>
        <Field width={150}>
          <Trans>Payee</Trans>
        </Field>
        <Field width="auto" style={{ flex: 1 }}>
          <Trans>When</Trans>
        </Field>
        <Field width={90}>
          <Trans>Next</Trans>
        </Field>
        <Field width={80} style={{ textAlign: 'right' }}>
          <Trans>Amount</Trans>
        </Field>
      </TableHeader>
      <Table
        rowHeight={ROW_HEIGHT}
        style={{
          flex: 1,
          backgroundColor: 'transparent',
        }}
        items={subscriptions}
        isSelected={id => selectedItems.has(String(id))}
        renderItem={renderItem}
        renderEmpty={t('No subscriptions found')}
      />
    </View>
  );
}

/**
 * Modal component for importing subscriptions from Wallos as scheduled transactions.
 *
 * Workflow:
 * 1. User selects Wallos JSON export file
 * 2. File is parsed and checked for duplicates
 * 3. Accounts are auto-matched by Payment Method or Notes field
 * 4. Payees are auto-matched by name, or marked for creation
 * 5. User reviews and selects subscriptions to import
 * 6. If new payees are needed, shows confirmation step
 * 7. Creates payees and schedules
 *
 * Features:
 * - JSON file import with validation
 * - Automatic account matching via Payment Method or Notes
 * - Payee matching and auto-creation
 * - Duplicate detection with warnings
 * - Two-step flow: selection → payee confirmation (if needed) → import
 * - Error handling and user feedback
 *
 * @example
 * // Triggered from schedules page via:
 * // pushModal('import-wallos')
 */
export function ImportWallosModal() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const payees = usePayees();
  const accounts = useAccounts();

  const [subscriptions, setSubscriptions] = useState<ImportedSubscription[]>(
    [],
  );
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPayeeConfirm, setShowPayeeConfirm] = useState(false);

  const selectedInst = useSelected<ImportedSubscription>(
    'wallos-import',
    subscriptions,
    [],
  );

  // Find payees that need to be created
  const payeesToCreate = useMemo(() => {
    const selected = subscriptions.filter(s => selectedInst.items.has(s.id));
    const newPayees = new Set<string>();

    for (const sub of selected) {
      if (sub.matchedPayeeName && !sub.selectedPayeeId) {
        newPayees.add(sub.matchedPayeeName);
      }
    }

    return Array.from(newPayees);
  }, [subscriptions, selectedInst.items]);

  // Check if all selected subscriptions have accounts assigned
  const allSelectedHaveAccounts = useMemo(() => {
    const selected = subscriptions.filter(s => selectedInst.items.has(s.id));
    return selected.every(s => s.selectedAccountId !== null);
  }, [subscriptions, selectedInst.items]);

  const handleFileSelect = useCallback(async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = async e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const content = await file.text();
          const parsed = parseWallosFile(content);

          // Check for duplicates
          const duplicateCheck = await send(
            'schedule/check-wallos-duplicates',
            parsed.map(s => ({ id: s.id, name: s.name, amount: s.amount })),
          );

          const duplicateMap = new Map(
            duplicateCheck.map(d => [d.subscriptionId, d.isDuplicate]),
          );

          // Try to match payees by name
          const imported: ImportedSubscription[] = parsed.map(sub => {
            const matchedPayee = payees.find(
              p =>
                p.name.toLowerCase().trim() === sub.name.toLowerCase().trim(),
            );

            // Try to match account by Payment Method or Notes
            const matchedAccount = accounts.find(a => {
              const accountName = a.name.toLowerCase().trim();
              const paymentMethod = sub.paymentMethod?.toLowerCase().trim();
              const notes = sub.notes?.toLowerCase().trim();
              return (
                (paymentMethod && accountName === paymentMethod) ||
                (notes && accountName === notes)
              );
            });

            return {
              ...sub,
              selectedAccountId: matchedAccount?.id || null,
              selectedPayeeId: matchedPayee?.id || null,
              matchedPayeeName: matchedPayee ? null : sub.name,
              isDuplicate: duplicateMap.get(sub.id) || false,
            };
          });

          // Sort by next payment date ascending (soonest first)
          imported.sort(
            (a, b) =>
              new Date(a.nextPaymentDate).getTime() -
              new Date(b.nextPaymentDate).getTime(),
          );

          setSubscriptions(imported);
          setError(null);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : t('Failed to parse file'),
          );
        }
      };

      input.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to parse file'));
    }
  }, [payees, accounts, t]);

  const handleAccountChange = useCallback(
    (subId: string, accountId: string | null) => {
      setSubscriptions(prev =>
        prev.map(s =>
          s.id === subId ? { ...s, selectedAccountId: accountId } : s,
        ),
      );
    },
    [],
  );

  const handlePayeeChange = useCallback(
    (subId: string, payeeId: string | null, payeeName: string | null) => {
      setSubscriptions(prev =>
        prev.map(s =>
          s.id === subId
            ? {
                ...s,
                selectedPayeeId: payeeId,
                matchedPayeeName: payeeId ? null : payeeName || s.name,
              }
            : s,
        ),
      );
    },
    [],
  );

  const handleImport = useCallback(async (): Promise<boolean> => {
    // If there are payees to create, show confirmation first
    if (payeesToCreate.length > 0 && !showPayeeConfirm) {
      setShowPayeeConfirm(true);
      return false;
    }

    setImporting(true);
    setShowPayeeConfirm(false);

    try {
      const selected = subscriptions.filter(s => selectedInst.items.has(s.id));

      // Create new payees first
      const payeeIdMap = new Map<string, string>();
      for (const name of payeesToCreate) {
        const result = await dispatch(createPayee({ name })).unwrap();
        payeeIdMap.set(name, result);
      }

      // Build import items, filtering out any with missing required fields
      const importItems = selected
        .map(sub => {
          const accountId = sub.selectedAccountId;
          if (!accountId) {
            console.warn(
              `Skipping subscription "${sub.name}": missing account`,
            );
            return null;
          }

          let payeeId = sub.selectedPayeeId;
          if (!payeeId && sub.matchedPayeeName) {
            payeeId = payeeIdMap.get(sub.matchedPayeeName) ?? null;
          }
          if (!payeeId) {
            console.warn(`Skipping subscription "${sub.name}": missing payee`);
            return null;
          }

          return {
            name: sub.name,
            amount: sub.amount,
            accountId,
            payeeId,
            date: toRecurConfig(sub),
          };
        })
        .filter(
          (
            item,
          ): item is {
            name: string;
            amount: number;
            accountId: string;
            payeeId: string;
            date: ReturnType<typeof toRecurConfig>;
          } => item !== null,
        );

      const result = await send('schedule/import-wallos', importItems);

      if (result.errors.length > 0) {
        setError(
          t('Some schedules failed to import: {{errors}}', {
            errors: result.errors.map(e => e.name).join(', '),
          }),
        );
        return false;
      }
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('Failed to import schedules'),
      );
      return false;
    } finally {
      setImporting(false);
    }
  }, [
    subscriptions,
    selectedInst.items,
    payeesToCreate,
    showPayeeConfirm,
    dispatch,
    t,
  ]);

  const handlePayeeConfirmCancel = useCallback(() => {
    setShowPayeeConfirm(false);
  }, []);

  return (
    <Modal
      name="import-wallos"
      containerProps={{
        style: showPayeeConfirm ? { width: 450 } : { width: 900, height: 650 },
      }}
    >
      {({ state: { close } }) =>
        showPayeeConfirm ? (
          // Payee confirmation view
          <>
            <ModalHeader
              title={t('Create New Payees')}
              rightContent={
                <ModalCloseButton onPress={handlePayeeConfirmCancel} />
              }
            />
            <Paragraph>
              <Trans>The following payees will be created:</Trans>
            </Paragraph>
            <View
              style={{
                maxHeight: 200,
                overflow: 'auto',
                marginBottom: 15,
                padding: '10px 15px',
                backgroundColor: theme.tableBackground,
                borderRadius: 4,
              }}
            >
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {payeesToCreate.map(name => (
                  <li key={name}>
                    <Text
                      style={{ fontWeight: 600, color: theme.noticeTextDark }}
                    >
                      {name}
                    </Text>
                  </li>
                ))}
              </ul>
            </View>
            <SpaceBetween
              style={{
                paddingTop: 10,
                justifyContent: 'flex-end',
              }}
            >
              <Button onPress={handlePayeeConfirmCancel}>
                <Trans>Cancel</Trans>
              </Button>
              <ButtonWithLoading
                variant="primary"
                isLoading={importing}
                onPress={async () => {
                  const success = await handleImport();
                  if (success) {
                    close();
                  }
                }}
              >
                <Trans>Create and Import</Trans>
              </ButtonWithLoading>
            </SpaceBetween>
          </>
        ) : (
          // Main import view
          <>
            <ModalHeader
              title={t('Import from Wallos')}
              rightContent={<ModalCloseButton onPress={close} />}
            />

            {subscriptions.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Paragraph style={{ marginBottom: 20, textAlign: 'center' }}>
                  <Trans>
                    Import subscription data from Wallos. Export your
                    subscriptions from Wallos as JSON and select the file below.
                  </Trans>
                </Paragraph>
                <Button variant="primary" onPress={handleFileSelect}>
                  <Trans>Select Wallos Export File</Trans>
                </Button>
                {error && (
                  <Text style={{ color: theme.errorText, marginTop: 15 }}>
                    {error}
                  </Text>
                )}
              </View>
            ) : (
              <>
                <Paragraph>
                  <Trans>
                    Select the subscriptions you want to import as schedules.
                    Each subscription needs an account assigned. Accounts are
                    automatically matched by Payment Method or Notes fields if
                    they contain an account name. Payees will be created
                    automatically using the subscription name if not selected.
                  </Trans>
                </Paragraph>

                <SelectedProvider instance={selectedInst}>
                  <ImportWallosTable
                    subscriptions={subscriptions}
                    onAccountChange={handleAccountChange}
                    onPayeeChange={handlePayeeChange}
                  />
                </SelectedProvider>

                {!allSelectedHaveAccounts && selectedInst.items.size > 0 && (
                  <Text
                    style={{
                      color: theme.warningText,
                      marginTop: 10,
                    }}
                  >
                    <Trans>
                      All selected subscriptions must have an account assigned
                    </Trans>
                  </Text>
                )}

                {error && (
                  <Text style={{ color: theme.errorText, marginTop: 10 }}>
                    {error}
                  </Text>
                )}

                <SpaceBetween
                  style={{
                    paddingTop: 20,
                    paddingBottom: 0,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Button onPress={handleFileSelect}>
                    <Trans>Select Different File</Trans>
                  </Button>
                  <ButtonWithLoading
                    variant="primary"
                    isLoading={importing}
                    isDisabled={
                      selectedInst.items.size === 0 || !allSelectedHaveAccounts
                    }
                    onPress={async () => {
                      const success = await handleImport();
                      if (success) {
                        close();
                      }
                    }}
                  >
                    <Trans>Import Selected</Trans>
                  </ButtonWithLoading>
                </SpaceBetween>
              </>
            )}
          </>
        )
      }
    </Modal>
  );
}
