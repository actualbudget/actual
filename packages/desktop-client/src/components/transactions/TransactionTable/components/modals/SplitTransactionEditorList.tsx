import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd, SvgDelete } from '@actual-app/components/icons/v0';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { integerToCurrency } from 'loot-core/shared/util';
import type { CategoryGroupEntity, TransactionEntity } from 'loot-core/types/models';

import { CategoryAutocomplete } from '@desktop-client/components/autocomplete/CategoryAutocomplete';
import {
  CustomCell,
  Field,
  InputCell,
  Row,
} from '@desktop-client/components/table';

import type { SplitDraft } from './useSplitTransactionEditor';

type SplitTransactionEditorListProps = {
  transaction: TransactionEntity;
  categoryGroups: CategoryGroupEntity[];
  splits: SplitDraft[];
  remainingAmount: number;
  onAddSplit: () => void;
  onRemoveSplit: (id: string) => void;
  onDistributeRemainder: () => void;
  onUpdateSplit: (
    id: string,
    field: keyof SplitDraft,
    value: SplitDraft[keyof SplitDraft],
  ) => void;
};

export function SplitTransactionEditorList({
  transaction,
  categoryGroups,
  splits,
  remainingAmount,
  onAddSplit,
  onRemoveSplit,
  onDistributeRemainder,
  onUpdateSplit,
}: SplitTransactionEditorListProps) {
  const { t } = useTranslation();
  const [exposedCell, setExposedCell] = useState<string | null>(null);

  function parseAmount(value: string) {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    const amount = isNaN(parsed) ? 0 : Math.round(parsed * 100);
    return transaction.amount < 0 ? -Math.abs(amount) : Math.abs(amount);
  }

  return (
    <>
      <View
        style={{
          marginBottom: 20,
          overflow: 'hidden',
          borderRadius: 4,
        }}
      >
        <Row
          style={{
            backgroundColor: theme.tableHeaderBackground,
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <Field
            width="flex"
            style={{ borderTopWidth: 0 }}
            contentStyle={{ color: theme.tableHeaderText, fontWeight: 600 }}
          >
            <Trans>Category</Trans>
          </Field>
          <Field
            width={140}
            style={{ borderTopWidth: 0 }}
            contentStyle={{
              justifyContent: 'center',
              textAlign: 'right',
              color: theme.tableHeaderText,
              fontWeight: 600,
            }}
          >
            <Trans>Amount</Trans>
          </Field>
          <Field
            width={40}
            style={{ borderTopWidth: 0 }}
            contentStyle={{ justifyContent: 'center' }}
          />
        </Row>

        {splits.map(split => (
          <Row
            key={split.id}
            collapsed
            style={{
              backgroundColor: theme.tableBackground,
            }}
          >
            <CustomCell
              width="flex"
              name={`split-category-${split.id}`}
              exposed={exposedCell === `split-category-${split.id}`}
              focused={exposedCell === `split-category-${split.id}`}
              onExpose={name => setExposedCell(name)}
              value={split.category || ''}
              formatter={value => value || t('Categorize')}
              valueStyle={{
                color: split.category ? undefined : theme.errorText,
                fontStyle: split.category ? undefined : 'italic',
              }}
              onBlur={() => setExposedCell(null)}
            >
              {({ onBlur, onKeyDown, onUpdate, onSave, inputStyle }) => (
                <CategoryAutocomplete
                  categoryGroups={categoryGroups}
                  value={split.category}
                  focused={exposedCell === `split-category-${split.id}`}
                  clearOnBlur={false}
                  inputProps={{
                    onBlur: event => {
                      onBlur(event);
                      setExposedCell(null);
                    },
                    onKeyDown,
                    style: inputStyle,
                  }}
                  onUpdate={onUpdate}
                  onSelect={value => {
                    onSave(value);
                    onUpdateSplit(split.id, 'category', value);
                    setExposedCell(null);
                  }}
                />
              )}
            </CustomCell>
            <InputCell
              width={140}
              exposed={exposedCell === `split-amount-${split.id}`}
              focused={exposedCell === `split-amount-${split.id}`}
              textAlign="right"
              name={`split-amount-${split.id}`}
              onExpose={name => setExposedCell(name)}
              value={
                split.amount !== 0 ? integerToCurrency(Math.abs(split.amount)) : ''
              }
              onUpdate={value =>
                onUpdateSplit(split.id, 'amount', parseAmount(value))
              }
              onBlur={() => setExposedCell(null)}
              inputProps={{
                placeholder: '0.00',
                style: {
                  textAlign: 'right',
                  ...styles.tnum,
                },
              }}
            />
            <Field
              width={40}
              truncate={false}
              contentStyle={{ alignItems: 'center', justifyContent: 'center' }}
            >
              {splits.length > 1 && (
                <Button
                  variant="bare"
                  onPress={() => onRemoveSplit(split.id)}
                  style={{ padding: 4 }}
                  aria-label={t('Remove split')}
                >
                  <SvgDelete
                    width={16}
                    height={16}
                    style={{ color: theme.errorText }}
                  />
                </Button>
              )}
            </Field>
          </Row>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
        <Button variant="bare" onPress={onAddSplit}>
          <SvgAdd width={10} height={10} style={{ marginRight: 5 }} />
          <Trans>Add Split</Trans>
        </Button>
        {remainingAmount !== 0 && (
          <Button variant="bare" onPress={onDistributeRemainder}>
            <Trans>Distribute Remainder</Trans>
          </Button>
        )}
      </View>
    </>
  );
}
