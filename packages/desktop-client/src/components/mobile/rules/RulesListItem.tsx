import React, {
  type CSSProperties,
  type ComponentPropsWithoutRef,
} from 'react';
import { mergeProps } from 'react-aria';
import { ListBoxItem } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { usePress } from '@react-aria/interactions';

import { format as formatDate, parseISO } from 'date-fns';

import { getRecurringDescription } from 'loot-core/shared/schedules';
import { friendlyOp, mapField } from 'loot-core/shared/rules';
import { integerToCurrency } from 'loot-core/shared/util';
import { type RuleEntity } from 'loot-core/types/models';

import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { usePayees } from '@desktop-client/hooks/usePayees';

const ROW_HEIGHT = 80;

const getTextStyle = (): CSSProperties => ({
  ...styles.text,
  fontSize: 14,
});

type RulesListItemProps = ComponentPropsWithoutRef<
  typeof ListBoxItem<RuleEntity>
> & {
  onPress: (rule: RuleEntity) => void;
};

export function RulesListItem({ onPress, ...props }: RulesListItemProps) {
  const { t } = useTranslation();
  const { list: categories } = useCategories();
  const payees = usePayees();
  const accounts = useAccounts();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const locale = useLocale();

  const { value: rule } = props;

  const { pressProps } = usePress({
    onPress: () => {
      onPress(rule!);
    },
  });

  if (!rule) {
    return null;
  }

  const textStyle = getTextStyle();

  // Helper function to map field values to names (similar to Value component)
  const mapValue = (field: string, value: any) => {
    if (value == null || value === '') {
      return t('(nothing)');
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    switch (field) {
      case 'amount':
        return integerToCurrency(value);
      case 'date':
        if (value) {
          if (typeof value === 'object' && value.frequency) {
            return getRecurringDescription(value, dateFormat, locale);
          }
          if (typeof value === 'string') {
            return formatDate(parseISO(value), dateFormat);
          }
        }
        return null;
      case 'notes':
      case 'imported_payee':
      case 'payee_name':
        return value;
      case 'payee': {
        const object = payees.find(p => p.id === value);
        return object ? object.name : t('(deleted)');
      }
      case 'category': {
        const object = categories.find(c => c.id === value);
        return object ? object.name : t('(deleted)');
      }
      case 'account': {
        const object = accounts.find(a => a.id === value);
        return object ? object.name : t('(deleted)');
      }
      default:
        return String(value);
    }
  };

  // Build a readable description of the rule conditions
  const conditionsText = rule.conditions
    .map(cond => {
      const fieldName = mapField(cond.field);
      const opName = friendlyOp(cond.op);
      let valueName;
      
      if (cond.op === 'oneOf' || cond.op === 'notOneOf') {
        if (Array.isArray(cond.value)) {
          valueName = cond.value.map(v => mapValue(cond.field, v)).join(', ');
        } else {
          valueName = mapValue(cond.field, cond.value);
        }
      } else {
        valueName = mapValue(cond.field, cond.value);
      }
      
      return `${fieldName} ${opName} ${valueName}`;
    })
    .join(` ${friendlyOp(rule.conditionsOp)} `);

  // Build a readable description of the rule actions
  const actionsText = rule.actions
    .map(action => {
      if (action.op === 'set') {
        const fieldName = mapField(action.field);
        const valueName = mapValue(action.field, action.value);
        return `${friendlyOp(action.op)} ${fieldName} to ${valueName}`;
      } else if (action.op === 'link-schedule') {
        return `${friendlyOp(action.op)} schedule`;
      } else if (action.op === 'prepend-notes' || action.op === 'append-notes') {
        return `${friendlyOp(action.op)} "${action.value}"`;
      }
      return friendlyOp(action.op);
    })
    .join(', ');

  return (
    <ListBoxItem textValue={rule.id} {...props}>
      {itemProps => (
        <Button
          {...mergeProps(itemProps, pressProps)}
          style={{
            userSelect: 'none',
            height: ROW_HEIGHT,
            width: '100%',
            borderRadius: 0,
            borderWidth: '0 0 1px 0',
            borderColor: theme.tableBorder,
            borderStyle: 'solid',
            backgroundColor: theme.tableBackground,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              flex: 1,
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
            }}
          >
            <View style={{ flex: 1 }}>
              {rule.stage && (
                <View
                  style={{
                    alignSelf: 'flex-start',
                    marginBottom: 4,
                    backgroundColor: theme.pillBackgroundSelected,
                    borderRadius: 4,
                    padding: '2px 6px',
                  }}
                >
                  <Text style={{ 
                    fontSize: 10, 
                    fontWeight: '600',
                    color: theme.pillTextSelected,
                  }}>
                    {rule.stage.toUpperCase()}
                  </Text>
                </View>
              )}
              
              <View style={{ marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: theme.pageTextLight, marginBottom: 2 }}>
                  {t('IF')}
                </Text>
                <TextOneLine
                  style={{
                    ...textStyle,
                    fontSize: 12,
                    color: theme.tableText,
                  }}
                >
                  {conditionsText}
                </TextOneLine>
              </View>

              <View>
                <Text style={{ fontSize: 11, color: theme.pageTextLight, marginBottom: 2 }}>
                  {t('THEN')}
                </Text>
                <TextOneLine
                  style={{
                    ...textStyle,
                    fontSize: 12,
                    color: theme.tableText,
                  }}
                >
                  {actionsText}
                </TextOneLine>
              </View>
            </View>
          </View>
        </Button>
      )}
    </ListBoxItem>
  );
}