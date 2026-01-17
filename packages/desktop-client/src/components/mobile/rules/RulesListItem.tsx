import React from 'react';
import { type GridListItemProps } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type RuleEntity } from 'loot-core/types/models';
import { type WithRequired } from 'loot-core/types/util';

import { ActionableGridListItem } from '@desktop-client/components/mobile/ActionableGridListItem';
import { ActionExpression } from '@desktop-client/components/rules/ActionExpression';
import { ConditionExpression } from '@desktop-client/components/rules/ConditionExpression';
import { groupActionsBySplitIndex } from '@desktop-client/util/ruleUtils';

type RulesListItemProps = {
  onDelete: () => void;
} & WithRequired<GridListItemProps<RuleEntity>, 'value'>;

export function RulesListItem({
  value: rule,
  onDelete,
  style,
  ...props
}: RulesListItemProps) {
  const { t } = useTranslation();

  // Group actions by splitIndex to handle split transactions
  const actionSplits = groupActionsBySplitIndex(rule.actions);
  const hasSplits = actionSplits.length > 1;

  return (
    <ActionableGridListItem
      id={rule.id}
      value={rule}
      textValue={t('Rule {{id}}', { id: rule.id })}
      style={{ ...styles.mobileListItem, padding: '8px 16px', ...style }}
      actions={
        <Button
          variant="bare"
          onPress={onDelete}
          style={{
            color: theme.errorText,
            width: '100%',
          }}
        >
          <Trans>Delete</Trans>
        </Button>
      }
      {...props}
    >
      <SpaceBetween gap={12} style={{ alignItems: 'flex-start' }}>
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
              data-testid="rule-stage-badge"
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
          <SpaceBetween gap={6}>
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
                  inline
                />
              </View>
            ))}
          </SpaceBetween>

          {/* THEN actions block */}
          <View
            style={{
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 4,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: theme.pageTextLight,
                marginBottom: 2,
              }}
            >
              {t('THEN')}
            </span>

            {hasSplits
              ? actionSplits.map((split, i) => (
                  <View
                    key={i}
                    style={{
                      width: '100%',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      marginTop: i > 0 ? 4 : 0,
                      padding: '6px',
                      borderColor: theme.tableBorder,
                      borderWidth: '1px',
                      borderRadius: '5px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        color: theme.pageTextLight,
                        marginBottom: 4,
                      }}
                    >
                      {i ? t('Split {{num}}', { num: i }) : t('Apply to all')}
                    </span>
                    {split.actions.map((action, j) => (
                      <View
                        key={j}
                        style={{
                          marginBottom: j !== split.actions.length - 1 ? 2 : 0,
                          maxWidth: '100%',
                        }}
                      >
                        <ActionExpression {...action} />
                      </View>
                    ))}
                  </View>
                ))
              : rule.actions.map((action, index) => (
                  <View
                    key={index}
                    style={{ marginBottom: 2, maxWidth: '100%' }}
                  >
                    <ActionExpression {...action} />
                  </View>
                ))}
          </View>
        </View>
      </SpaceBetween>
    </ActionableGridListItem>
  );
}
