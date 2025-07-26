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
        minHeight: ROW_HEIGHT,
        width: '100%',
        borderRadius: 0,
        borderWidth: '0 0 1px 0',
        borderColor: theme.tableBorder,
        borderStyle: 'solid',
        backgroundColor: theme.tableBackground,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        padding: '8px 16px',
        gap: 12,
      }}
      onPress={onPress}
    >
      {/* Column 1: PRE/POST pill */}
      <View
        style={{
          flexShrink: 0,
          paddingTop: 2, // Slight top padding to align with text baseline
        }}
      >
        <View
          style={{
            backgroundColor:
              rule.stage === 'pre'
                ? theme.noticeBackgroundLight
                : rule.stage === 'post'
                  ? theme.warningBackground
                  : theme.pillBackgroundSelected,
            paddingLeft: 6,
            paddingRight: 6,
            paddingTop: 2,
            paddingBottom: 2,
            borderRadius: 3,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color:
                rule.stage === 'pre'
                  ? theme.noticeTextLight
                  : rule.stage === 'post'
                    ? theme.warningText
                    : theme.pillTextSelected,
            }}
          >
            {rule.stage === 'pre'
              ? t('PRE')
              : rule.stage === 'post'
                ? t('POST')
                : t('DEFAULT')}
          </span>
        </View>
      </View>

      {/* Column 2: IF and THEN blocks */}
      <View
        style={{
          flex: 1,
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {/* IF conditions block */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 6,
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

        {/* THEN actions block */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 6,
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
      </View>
    </Button>
  );
}
