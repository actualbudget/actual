import React, { useState } from 'react';
import type { DragItem } from 'react-aria';
import { DropIndicator, GridList, useDragAndDrop } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '#components/common/Modal';
import { Checkbox } from '#components/forms';
import { TransactionTableColumnListItem } from '#components/modals/TransactionTableColumnListItem';
import {
  getDefaultTransactionTableColumns,
  useTransactionTableColumnLabels,
} from '#components/transactions/table/columns';
import type {
  TransactionTableColumn,
  TransactionTableColumnId,
} from '#components/transactions/table/columns';
import type { Modal as ModalType } from '#modals/modalsSlice';

type TransactionTableColumnsModalProps = Extract<
  ModalType,
  { name: 'transaction-table-columns' }
>['options'];

export function TransactionTableColumnsModal({
  columns: initialColumns,
  onSave,
}: TransactionTableColumnsModalProps) {
  const { t } = useTranslation();
  const columnLabels = useTransactionTableColumnLabels();

  const [columns, setColumns] =
    useState<TransactionTableColumn[]>(initialColumns);
  const [applyToAll, setApplyToAll] = useState(false);

  const onToggleColumn = (id: TransactionTableColumnId, isVisible: boolean) => {
    setColumns(prev => {
      // Keep at least one amount column visible — new transactions need an
      // amount input
      if (!isVisible && (id === 'payment' || id === 'deposit')) {
        const other = id === 'payment' ? 'deposit' : 'payment';
        if (prev.find(column => column.id === other)?.hidden) {
          return prev;
        }
      }
      return prev.map(column =>
        column.id === id ? { ...column, hidden: !isVisible } : column,
      );
    });
  };

  const onResetToDefault = () => {
    // Only reset the columns that are available in this view
    setColumns(
      getDefaultTransactionTableColumns().filter(column =>
        initialColumns.some(c => c.id === column.id),
      ),
    );
  };

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: keys =>
      [...keys].map(key => ({ 'text/plain': String(key) }) satisfies DragItem),
    renderDropIndicator: target => (
      <DropIndicator
        target={target}
        className={css({
          '&[data-drop-target]': {
            height: 4,
            backgroundColor: theme.tableBorderSeparator,
            opacity: 1,
            borderRadius: 4,
          },
        })}
      />
    ),
    onReorder: e => {
      const [key] = e.keys;
      const targetId = e.target.key;

      setColumns(prev => {
        const moved = prev.find(c => c.id === key);
        if (!moved || key === targetId) {
          return prev;
        }

        const remaining = prev.filter(c => c.id !== key);
        const targetIdx = remaining.findIndex(c => c.id === targetId);
        if (targetIdx === -1) {
          return prev;
        }

        const insertAt =
          e.target.dropPosition === 'after' ? targetIdx + 1 : targetIdx;
        return [
          ...remaining.slice(0, insertAt),
          moved,
          ...remaining.slice(insertAt),
        ];
      });
    },
  });

  return (
    <Modal
      name="transaction-table-columns"
      containerProps={{ style: { width: 400 } }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Table columns')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View style={{ gap: 15 }}>
            <Text style={{ color: theme.pageTextLight, lineHeight: 1.5 }}>
              <Trans>
                Choose which columns appear in the transaction table and drag
                them into the order you prefer.
              </Trans>
            </Text>

            <GridList
              aria-label={t('Transaction table columns')}
              items={columns}
              dragAndDropHooks={dragAndDropHooks}
              dependencies={[columnLabels]}
              className={css({ display: 'flex', flexDirection: 'column' })}
            >
              {column => (
                <TransactionTableColumnListItem
                  key={column.id}
                  column={column}
                  label={columnLabels[column.id]}
                  onToggle={onToggleColumn}
                />
              )}
            </GridList>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                padding: '8px 10px',
                borderRadius: 6,
                backgroundColor: theme.tableRowBackgroundHover,
              }}
            >
              <Checkbox
                id="apply-columns-to-all"
                checked={applyToAll}
                onChange={e => setApplyToAll(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <label
                htmlFor="apply-columns-to-all"
                style={{ flex: 1, userSelect: 'none', cursor: 'pointer' }}
              >
                <Text style={{ display: 'block' }}>
                  <Trans>Apply to all transaction tables</Trans>
                </Text>
                <Text
                  style={{
                    display: 'block',
                    color: theme.pageTextSubdued,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  <Trans>
                    Use this layout everywhere, not just in the current view.
                  </Trans>
                </Text>
              </label>
            </View>

            <ModalButtons
              style={{ marginTop: 0 }}
              leftContent={
                <Button variant="bare" onPress={onResetToDefault}>
                  <Trans>Reset to default</Trans>
                </Button>
              }
            >
              <Button style={{ marginRight: 10 }} onPress={() => state.close()}>
                <Trans>Cancel</Trans>
              </Button>
              <Button
                variant="primary"
                onPress={() => {
                  onSave(columns, applyToAll);
                  state.close();
                }}
              >
                <Trans>Save</Trans>
              </Button>
            </ModalButtons>
          </View>
        </>
      )}
    </Modal>
  );
}
