import React, { useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { mapField, friendlyOp } from 'loot-core/shared/rules';
import { integerToCurrency } from 'loot-core/shared/util';
import { type RuleConditionEntity } from 'loot-core/types/models';

import { FilterEditor } from './FiltersMenu';
import { subfieldFromFilter } from './subfieldFromFilter';

import { Value } from '@desktop-client/components/rules/Value';

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
              {!['onbudget', 'offbudget'].includes(op?.toLocaleLowerCase()) && (
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
              )}
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
