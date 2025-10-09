import { type CSSProperties } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import AutoSizer from 'react-virtualized-auto-sizer';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type RuleEntity } from 'loot-core/types/models';

import { FixedSizeList } from '@desktop-client/components/FixedSizeList';
import { MOBILE_NAV_HEIGHT } from '@desktop-client/components/mobile/MobileNavTabs';
import { ActionExpression } from '@desktop-client/components/rules/ActionExpression';
import { ConditionExpression } from '@desktop-client/components/rules/ConditionExpression';
import { groupActionsBySplitIndex } from '@desktop-client/util/ruleUtils';

type RulesListProps = {
  rules: RuleEntity[];
  isLoading: boolean;
  onRulePress: (rule: RuleEntity) => void;
  onRuleDelete: (rule: RuleEntity) => void;
};

type VirtualizedRulesListItemProps = {
  rule: RuleEntity;
  onAction: () => void;
  onDelete: () => void;
};

function VirtualizedRulesListItem({
  rule,
  onAction,
  onDelete,
}: VirtualizedRulesListItemProps) {
  const { t } = useTranslation();

  // Group actions by splitIndex to handle split transactions
  const actionSplits = groupActionsBySplitIndex(rule.actions);
  const hasSplits = actionSplits.length > 1;

  return (
    <div
      role="row"
      style={{
        ...styles.mobileListItem,
        padding: '8px 16px',
        backgroundColor: theme.tableBackground,
        borderBottomWidth: 1,
        borderBottomColor: theme.tableBorder,
        borderBottomStyle: 'solid',
        cursor: 'pointer',
      }}
      onClick={onAction}
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
                  inline={true}
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

        {/* Delete button */}
        <View style={{ flexShrink: 0, marginLeft: 8 }}>
          <Button
            variant="bare"
            onPress={() => {
              onDelete();
            }}
            style={{
              color: theme.errorText,
              padding: '4px 8px',
            }}
          >
            <Trans>Delete</Trans>
          </Button>
        </View>
      </SpaceBetween>
    </div>
  );
}

export function RulesList({
  rules,
  isLoading,
  onRulePress,
  onRuleDelete,
}: RulesListProps) {
  const { t } = useTranslation();

  if (isLoading && rules.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 100,
        }}
      >
        <AnimatedLoading style={{ width: 25, height: 25 }} />
      </View>
    );
  }

  if (rules.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 20,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: theme.pageTextSubdued,
            textAlign: 'center',
          }}
        >
          {t('No rules found. Create your first rule to get started!')}
        </Text>
      </View>
    );
  }

  const ITEM_HEIGHT = 60; // Approximate height of each rule item

  const renderRuleItem = ({
    index,
    style,
  }: {
    index: number;
    style: CSSProperties;
  }) => {
    const rule = rules[index];
    return (
      <div style={style}>
        <VirtualizedRulesListItem
          rule={rule}
          onAction={() => onRulePress(rule)}
          onDelete={() => onRuleDelete(rule)}
        />
      </div>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingBottom: MOBILE_NAV_HEIGHT }}>
        <AutoSizer>
          {({ width, height }) => (
            <div
              role="grid"
              aria-label={t('Rules')}
              aria-busy={isLoading || undefined}
              style={{ width, height }}
            >
              <FixedSizeList
                width={width}
                height={height}
                itemCount={rules.length}
                itemSize={ITEM_HEIGHT}
                renderRow={renderRuleItem}
              />
            </div>
          )}
        </AutoSizer>
      </View>
      {isLoading && (
        <View
          style={{
            alignItems: 'center',
            paddingTop: 20,
          }}
        >
          <AnimatedLoading style={{ width: 20, height: 20 }} />
        </View>
      )}
    </View>
  );
}
