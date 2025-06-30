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
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { PressResponder, usePress } from '@react-aria/interactions';


import { friendlyOp } from 'loot-core/shared/rules';
import { type RuleEntity } from 'loot-core/types/models';

import { ActionExpression } from '@desktop-client/components/rules/ActionExpression';
import { ConditionExpression } from '@desktop-client/components/rules/ConditionExpression';

// Dynamic height - will be determined by content

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

  const { value: rule } = props;

  const { pressProps } = usePress({
    onPress: () => {
      if (rule) {
        onPress(rule);
      }
    },
  });

  if (!rule) {
    return null;
  }

  const textStyle = getTextStyle();

  return (
    <ListBoxItem textValue={rule.id} {...props}>
      {itemProps => (
        <PressResponder {...pressProps}>
          <Button
            {...itemProps}
            style={{
              userSelect: 'none',
              minHeight: 60, // Minimum height, but can grow with content
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
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {rule.conditions.map((cond, i) => (
                    <ConditionExpression
                      key={i}
                      field={cond.field}
                      op={cond.op}
                      inline={true}
                      value={cond.value}
                      options={cond.options}
                      prefix={i > 0 ? friendlyOp(rule.conditionsOp) : null}
                      style={{ fontSize: 11 }}
                    />
                  ))}
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 11, color: theme.pageTextLight, marginBottom: 2 }}>
                  {t('THEN')}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                  {rule.actions.map((action, i) => (
                    <ActionExpression
                      key={i}
                      {...action}
                      style={{ fontSize: 11 }}
                    />
                  ))}
                </View>
              </View>
            </View>
          </View>
          </Button>
        </PressResponder>
      )}
    </ListBoxItem>
  );
}