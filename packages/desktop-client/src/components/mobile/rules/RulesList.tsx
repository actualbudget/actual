import { GridList, ListLayout, Virtualizer } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { RuleEntity } from 'loot-core/types/models';

import { ROW_HEIGHT, RulesListItem } from './RulesListItem';

import { MOBILE_NAV_HEIGHT } from '@desktop-client/components/mobile/MobileNavTabs';

type RulesListProps = {
  rules: RuleEntity[];
  isLoading: boolean;
  onRulePress: (rule: RuleEntity) => void;
  onRuleDelete: (rule: RuleEntity) => void;
};

export function RulesList({
  rules,
  isLoading,
  onRulePress,
  onRuleDelete,
}: RulesListProps) {
  const { t } = useTranslation();

  if (isLoading) {
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

  return (
    <View style={{ flex: 1, overflow: 'auto' }}>
      <Virtualizer
        layout={ListLayout}
        layoutOptions={{
          estimatedRowHeight: ROW_HEIGHT,
        }}
      >
        <GridList
          aria-label={t('Rules')}
          aria-busy={isLoading || undefined}
          items={rules}
          style={{
            paddingBottom: MOBILE_NAV_HEIGHT,
          }}
          renderEmptyState={() => (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.mobilePageBackground,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: theme.pageTextSubdued,
                  textAlign: 'center',
                }}
              >
                <Trans>
                  No rules found. Create your first rule to get started!
                </Trans>
              </Text>
            </View>
          )}
        >
          {rule => (
            <RulesListItem
              value={rule}
              onAction={() => onRulePress(rule)}
              onDelete={() => onRuleDelete(rule)}
            />
          )}
        </GridList>
      </Virtualizer>
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
