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

import { friendlyOp, mapField } from 'loot-core/shared/rules';
import { type RuleEntity } from 'loot-core/types/models';

import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useCategories } from '@desktop-client/hooks/useCategories';
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

  // Helper function to map field values to names
  const mapValue = (field: string, value: any) => {
    if (!value) return '';

    let object = null;
    if (field === 'payee') {
      object = payees.find(p => p.id === value);
    } else if (field === 'category') {
      object = categories.find(c => c.id === value);
    } else if (field === 'account') {
      object = accounts.find(a => a.id === value);
    } else {
      return value;
    }
    
    if (object) {
      return object.name;
    }
    return '(deleted)';
  };

  // Build a readable description of the rule conditions
  const conditionsText = rule.conditions
    .map(cond => {
      const fieldName = mapField(cond.field);
      const opName = friendlyOp(cond.op);
      const valueName = cond.op === 'oneOf' || cond.op === 'notOneOf'
        ? cond.value.map(v => mapValue(cond.field, v)).join(', ')
        : mapValue(cond.field, cond.value);
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
                    color: theme.pillTextSelected,
                    borderRadius: 4,
                    padding: '2px 6px',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '600' }}>
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