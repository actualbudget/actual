import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type RuleEntity } from 'loot-core/types/models';

import { ActionExpression } from '@desktop-client/components/rules/ActionExpression';
import { ConditionExpression } from '@desktop-client/components/rules/ConditionExpression';

type RulesListItemProps = {
  rule: RuleEntity;
  onPress: () => void;
};

export function RulesListItem({ rule, onPress }: RulesListItemProps) {
  const { t } = useTranslation();

  return (
    <Button
      variant="bare"
      style={{
        backgroundColor: theme.tableBackground,
        borderRadius: 6,
        marginLeft: 10,
        marginRight: 10,
        marginTop: 5,
        marginBottom: 5,
        padding: 10,
        minHeight: 60,
        flexDirection: 'column',
        gap: 8,
        width: 'calc(100% - 20px)',
      }}
      onPress={onPress}
    >
      {/* Stage badge */}
      <View style={{ alignSelf: 'flex-start' }}>
        <View
          style={{
            backgroundColor:
              rule.stage === 'pre'
                ? theme.noticeBackgroundLight
                : theme.warningBackground,
            paddingLeft: 8,
            paddingRight: 8,
            paddingTop: 4,
            paddingBottom: 4,
            borderRadius: 4,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color:
                rule.stage === 'pre'
                  ? theme.noticeTextLight
                  : theme.warningText,
            }}
          >
            {rule.stage === 'pre' ? t('PRE') : t('POST')}
          </span>
        </View>
      </View>

      {/* IF conditions - inline */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 4,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: theme.pageTextLight,
            marginRight: 4,
          }}
        >
          {t('IF')}
        </span>
        {rule.conditions.map((condition, index) => (
          <View key={index} style={{ marginRight: 4, marginBottom: 4 }}>
            <ConditionExpression
              field={condition.field}
              op={condition.op}
              value={condition.value}
              options={condition.options}
              inline={true}
            />
          </View>
        ))}
      </View>

      {/* THEN actions - inline */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 4,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: theme.pageTextLight,
            marginRight: 4,
          }}
        >
          {t('THEN')}
        </span>
        {rule.actions.map((action, index) => (
          <View key={index} style={{ marginRight: 4, marginBottom: 4 }}>
            <ActionExpression {...action} />
          </View>
        ))}
      </View>
    </Button>
  );
}
