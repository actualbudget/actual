import { memo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type { ExchangeRateEntity } from '@actual-app/core/types/models';

import {
  Cell,
  InputCell,
  Row,
  SelectCell,
  SelectedItemsButton,
  Table,
  TableHeader,
  useTableNavigator,
} from '#components/table';
import { useContextMenu } from '#hooks/useContextMenu';
import { useDateFormat } from '#hooks/useDateFormat';
import {
  SelectedProvider,
  useSelected,
  useSelectedDispatch,
  useSelectedItems,
} from '#hooks/useSelected';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

import { formatRate, MAX_RATE, MIN_RATE, parseRate } from './rateFormat';

// Below this the page scrolls instead of the table getting any smaller
const MIN_TABLE_HEIGHT = 300;

// The message of an error from the server, which arrives as a plain object
export function getErrorMessage(error: unknown): string | undefined {
  return typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : undefined;
}

function useNotifyError() {
  const dispatch = useDispatch();
  return (message: string, error?: unknown, id?: string) =>
    dispatch(
      addNotification({
        notification: {
          id,
          type: 'error',
          message,
          pre: getErrorMessage(error),
        },
      }),
    );
}

// Deletes rates, and says so when that fails. Resolves to whether they were
// deleted.
export function useDeleteRates() {
  const { t } = useTranslation();
  const notifyError = useNotifyError();

  return async (ids: Array<ExchangeRateEntity['id']>) => {
    try {
      await send('exchange-rates-delete', { ids });
      return true;
    } catch (error) {
      notifyError(t('The exchange rates could not be deleted.'), error);
      return false;
    }
  };
}

type ExchangeRatesTableProps = {
  exchangeRates: ExchangeRateEntity[];
  // Asks to delete every rate of the pair
  onDeletePair: () => void;
};

export function ExchangeRatesTable({
  exchangeRates,
  onDeletePair,
}: ExchangeRatesTableProps) {
  const selectedInst = useSelected('exchange-rates', exchangeRates, []);
  const navigator = useTableNavigator(exchangeRates, ['select', 'rate']);
  const [hoveredId, setHoveredId] = useState<string>();

  if (exchangeRates.length === 0) {
    return (
      <Text style={{ color: theme.pageTextSubdued }}>
        <Trans>No exchange rates yet.</Trans>
      </Text>
    );
  }

  return (
    <SelectedProvider instance={selectedInst}>
      {/* Takes the rest of the page and scrolls on its own, like the other
          management tables, so the form above stays in view */}
      <View style={{ gap: 10, flex: 1, minHeight: MIN_TABLE_HEIGHT }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <SelectedExchangeRatesButton />
          <Button variant="bare" onPress={onDeletePair}>
            <Trans>Delete pair…</Trans>
          </Button>
        </View>
        <View style={styles.tableContainer}>
          <ExchangeRatesHeader />
          <Table
            navigator={navigator}
            items={exchangeRates}
            backgroundColor={theme.tableBackground}
            renderItem={({ item, focusedField, onEdit }) => (
              <ExchangeRateRow
                key={item.id}
                exchangeRate={item}
                hovered={hoveredId === item.id}
                onHover={setHoveredId}
                focusedField={focusedField}
                onEdit={onEdit}
              />
            )}
          />
        </View>
      </View>
    </SelectedProvider>
  );
}

function ExchangeRatesHeader() {
  const { t } = useTranslation();
  const selectedItems = useSelectedItems();
  const dispatchSelected = useSelectedDispatch();

  return (
    <TableHeader>
      <SelectCell
        exposed
        focused={false}
        selected={selectedItems.size > 0}
        onSelect={e =>
          dispatchSelected({ type: 'select-all', isRangeSelect: e.shiftKey })
        }
      />
      <Cell value={t('Date')} width={130} />
      <Cell value={t('Rate')} width={150} />
      <Cell value={t('Inverse')} width="flex" />
      <Cell value={t('Source')} width={100} />
    </TableHeader>
  );
}

type Actions = 'delete-rates';

function SelectedExchangeRatesButton() {
  const { t } = useTranslation();
  const dispatch = useSelectedDispatch();
  const selectedItems = useSelectedItems();
  const deleteRates = useDeleteRates();

  // A failed delete keeps the selection, so it can be tried again
  const deleteSelected = async () => {
    if (await deleteRates([...selectedItems])) {
      dispatch({ type: 'select-none' });
    }
  };

  useHotkeys('d', () => void deleteSelected(), {
    enabled: selectedItems.size > 0,
  });

  return (
    <SelectedItemsButton<Actions>
      id="selected-exchange-rates"
      name={count => t('{{count}} rates', { count })}
      items={[{ name: 'delete-rates', text: t('Delete'), key: 'D' }]}
      onSelect={name => {
        if (name === 'delete-rates') {
          void deleteSelected();
        }
      }}
    />
  );
}

type ExchangeRateRowProps = {
  exchangeRate: ExchangeRateEntity;
  hovered: boolean;
  onHover: (id?: string) => void;
  focusedField: string | null;
  onEdit: (id: string | null, field?: string) => void;
};

const ExchangeRateRow = memo(
  ({
    exchangeRate,
    hovered,
    onHover,
    focusedField,
    onEdit,
  }: ExchangeRateRowProps) => {
    const { t } = useTranslation();
    const dateFormat = useDateFormat() || 'MM/dd/yyyy';
    const dispatchSelected = useSelectedDispatch();
    const selectedIds = useSelectedItems();
    const selected = selectedIds.has(exchangeRate.id);
    const triggerRef = useRef(null);
    const deleteRates = useDeleteRates();
    const notifyError = useNotifyError();

    // Acts on every selected rate when this one is part of the selection
    const contextActionIds = selected ? [...selectedIds] : [exchangeRate.id];

    useContextMenu({
      triggerRef,
      items: [
        {
          name: 'delete',
          text:
            contextActionIds.length > 1
              ? t('Delete {{count}} rates', { count: contextActionIds.length })
              : t('Delete'),
          onClick: () => {
            void deleteRates(contextActionIds).then(isDeleted => {
              if (isDeleted) {
                dispatchSelected({ type: 'select-none' });
              }
            });
          },
        },
      ],
    });

    // A rate that can't be read is not saved, and the cell goes back to the
    // saved rate
    const onUpdateRate = async (value: string) => {
      const rate = parseRate(value);
      if (rate === null) {
        notifyError(
          t('The rate must be a number from {{min}} to {{max}}.', {
            min: formatRate(MIN_RATE),
            max: formatRate(MAX_RATE),
          }),
          undefined,
          // Saving with Enter and then leaving the cell says it only once
          `invalid-exchange-rate-${exchangeRate.id}`,
        );
        return;
      }
      if (rate === exchangeRate.rate) {
        return;
      }
      try {
        await send('exchange-rate-update', { id: exchangeRate.id, rate });
      } catch (error) {
        notifyError(t('The exchange rate could not be saved.'), error);
      }
    };

    return (
      <Row
        ref={triggerRef}
        collapsed
        style={{
          borderColor: selected ? theme.tableBorderSelected : 'none',
          backgroundColor: selected
            ? theme.tableRowBackgroundHighlight
            : hovered
              ? theme.tableRowBackgroundHover
              : theme.tableBackground,
        }}
        onMouseEnter={() => onHover(exchangeRate.id)}
        onMouseLeave={() => onHover()}
      >
        <SelectCell
          exposed={hovered || selected || focusedField === 'select'}
          focused={focusedField === 'select'}
          selected={selected}
          onSelect={e =>
            dispatchSelected({
              type: 'select',
              id: exchangeRate.id,
              isRangeSelect: e.shiftKey,
            })
          }
        />
        <Cell
          width={130}
          value={monthUtils.format(exchangeRate.date, dateFormat)}
        />
        <InputCell
          width={150}
          name="rate"
          exposed={focusedField === 'rate'}
          onExpose={name => onEdit(exchangeRate.id, name)}
          value={formatRate(exchangeRate.rate)}
          inputProps={{
            value: formatRate(exchangeRate.rate),
            inputMode: 'decimal',
            onUpdate: value => void onUpdateRate(value),
          }}
        />
        <Cell
          width="flex"
          style={{ color: theme.tableTextLight }}
          value={t('1 {{to}} = {{rate}} {{from}}', {
            to: exchangeRate.to_currency,
            from: exchangeRate.from_currency,
            rate: formatRate(1 / exchangeRate.rate, 6),
          })}
        />
        <Cell
          width={100}
          style={{ color: theme.tableTextLight }}
          value={
            exchangeRate.source === 'manual'
              ? t('Manual')
              : exchangeRate.source === 'frankfurter'
                ? t('Frankfurter')
                : exchangeRate.source
          }
        />
      </Row>
    );
  },
);

ExchangeRateRow.displayName = 'ExchangeRateRow';
