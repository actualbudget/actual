import React from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type RuleEntity } from 'loot-core/types/models';

import { ConditionExpression } from '../../rules/ConditionExpression';
import { ActionExpression } from '../../rules/ActionExpression';

type RulesListItemProps = {
  rule: RuleEntity;
  onPress: () => void;
};

export function RulesListItem({ rule, onPress }: RulesListItemProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        backgroundColor: theme.tableBackground,
        borderRadius: 6,
        marginHorizontal: 10,
        marginVertical: 5,
        padding: 10,
        minHeight: 60,
        flexDirection: 'column',
        gap: 8,
        cursor: 'pointer',
      }}
      onPress={onPress}
    >
      {/* Stage badge */}
      <View style={{ alignSelf: 'flex-start' }}>
        <View
          style={{
            backgroundColor: rule.stage === 'pre' ? theme.noticeBackgroundLight : theme.warningBackgroundLight,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 4,
          }}
        >
          <span style={{ 
            fontSize: 12, 
            fontWeight: 500,
            color: rule.stage === 'pre' ? theme.noticeTextLight : theme.warningTextLight,
          }}>
            {rule.stage === 'pre' ? t('PRE') : t('POST')}
          </span>
        </View>
      </View>

      {/* IF conditions - inline */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 }}>
        <span style={{ 
          fontSize: 14, 
          fontWeight: 600, 
          color: theme.pageTextLight,
          marginRight: 4,
        }}>
          {t('IF')}
        </span>
        {rule.conditions.map((condition, index) => (
          <View key={index} style={{ marginRight: 4, marginBottom: 4 }}>
            <ConditionExpression condition={condition} />
          </View>
        ))}
      </View>

      {/* THEN actions - inline */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 }}>
        <span style={{ 
          fontSize: 14, 
          fontWeight: 600, 
          color: theme.pageTextLight,
          marginRight: 4,
        }}>
          {t('THEN')}
        </span>
        {rule.actions.map((action, index) => (
          <View key={index} style={{ marginRight: 4, marginBottom: 4 }}>
            <ActionExpression action={action} />
          </View>
        ))}
      </View>
    </View>
  );
}