import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type RuleEntity } from 'loot-core/types/models';

import { ActionExpression } from '@desktop-client/components/rules/ActionExpression';
import { ConditionExpression } from '@desktop-client/components/rules/ConditionExpression';

const ROW_HEIGHT = 60;

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
        height: ROW_HEIGHT,
        width: '100%',
        borderRadius: 0,
        borderWidth: '0 0 1px 0',
        borderColor: theme.tableBorder,
        borderStyle: 'solid',
        backgroundColor: theme.tableBackground,
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '8px 16px',
        gap: 4,
      }}
      onPress={onPress}
    >
      {/* IF conditions with pre/post label - inline and left-aligned */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 6,
          width: '100%',
        }}
      >
        <View
          style={{
            backgroundColor:
              rule.stage === 'pre'
                ? theme.noticeBackgroundLight
                : theme.warningBackground,
            paddingLeft: 6,
            paddingRight: 6,
            paddingTop: 2,
            paddingBottom: 2,
            borderRadius: 3,
            marginRight: 4,
          }}
        >
          <span
            style={{
              fontSize: 11,
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

        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: theme.pageTextLight,
            marginRight: 4,
          }}
        >
          {t('IF')}
        </span>

        {rule.conditions.map((condition, index) => (
          <View key={index} style={{ marginRight: 4, marginBottom: 2 }}>
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

      {/* THEN actions - inline and left-aligned */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 6,
          width: '100%',
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: theme.pageTextLight,
            marginRight: 4,
          }}
        >
          {t('THEN')}
        </span>

        {rule.actions.map((action, index) => (
          <View key={index} style={{ marginRight: 4, marginBottom: 2 }}>
            <ActionExpression {...action} />
          </View>
        ))}
      </View>
    </Button>
  );
}
