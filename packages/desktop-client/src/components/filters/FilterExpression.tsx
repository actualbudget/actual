import React, { useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { mapField, friendlyOp } from 'loot-core/src/shared/rules';
import { integerToCurrency } from 'loot-core/src/shared/util';
import { type RuleConditionEntity } from 'loot-core/src/types/models';

import { SvgDelete } from '../../icons/v0';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Value } from '../rules/Value';

import { FilterEditor } from './FiltersMenu';
import { subfieldFromFilter } from './subfieldFromFilter';

let isDatepickerClick = false;

type FilterExpressionProps<T extends RuleConditionEntity> = {
  field: T['field'];
  customName: T['customName'];
  op: T['op'];
  value: T['value'];
  options: T['options'];
  style?: CSSProperties;
  onChange: (cond: T) => void;
  onDelete: () => void;
};

export function FilterExpression<T extends RuleConditionEntity>({
  field: originalField,
  customName,
  op,
  value,
  options,
  style,
  onChange,
  onDelete,
}: FilterExpressionProps<T>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const triggerRef = useRef(null);

  const field = subfieldFromFilter({ field: originalField, value });

  return (
    <View
      style={{
        backgroundColor: theme.pillBackground,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
        marginTop: 10,
        ...style,
      }}
    >
      <Button
        ref={triggerRef}
        variant="bare"
        isDisabled={customName != null}
        onPress={() => setEditing(true)}
        style={{
          maxWidth: 'calc(100% - 26px)',
          whiteSpace: 'nowrap',
          display: 'block',
        }}
      >
        <div
          style={{
            paddingBlock: 1,
            paddingLeft: 5,
            paddingRight: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {customName ? (
            <Text style={{ color: theme.pageTextPositive }}>{customName}</Text>
          ) : (
            <>
              <Text style={{ color: theme.pageTextPositive }}>
                {mapField(field, options)}
              </Text>{' '}
              <Text>{friendlyOp(op, null)}</Text>{' '}
              <Value
                value={value}
                field={field}
                inline={true}
                valueIsRaw={
                  op === 'contains' ||
                  op === 'matches' ||
                  op === 'doesNotContain' ||
                  op === 'hasTags'
                }
              />
            </>
          )}
        </div>
      </Button>
      <Button variant="bare" onPress={onDelete} aria-label={t('Delete filter')}>
        <SvgDelete
          style={{
            width: 8,
            height: 8,
            margin: 4,
          }}
        />
      </Button>

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={editing}
        onOpenChange={() => setEditing(false)}
        shouldCloseOnInteractOutside={element => {
          // Datepicker selections for some reason register 2x clicks
          // We want to keep the popover open after selecting a date.
          // So we ignore the "close" event on selection + the subsequent event.
          if (element instanceof HTMLElement && element.dataset.pikaYear) {
            isDatepickerClick = true;
            return false;
          }
          if (isDatepickerClick) {
            isDatepickerClick = false;
            return false;
          }

          return true;
        }}
        style={{ width: 275, padding: 15, color: theme.menuItemText }}
        data-testid="filters-menu-tooltip"
      >
        <FilterEditor
          field={originalField}
          op={op}
          value={
            field === 'amount' && typeof value === 'number'
              ? integerToCurrency(value)
              : value
          }
          options={options}
          onSave={onChange}
          onClose={() => setEditing(false)}
        />
      </Popover>
    </View>
  );
}
