import { type UIEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type RuleEntity } from 'loot-core/types/models';

import { RulesListItem } from './RulesListItem';

import { MOBILE_NAV_HEIGHT } from '@desktop-client/components/mobile/MobileNavTabs';

type RulesListProps = {
  rules: RuleEntity[];
  isLoading: boolean;
  onRulePress: (rule: RuleEntity) => void;
  onLoadMore?: () => void;
};

export function RulesList({
  rules,
  isLoading,
  onRulePress,
  onLoadMore,
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

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    if (!onLoadMore) return;

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      onLoadMore();
    }
  };

  return (
    <View
      style={{ flex: 1, paddingBottom: MOBILE_NAV_HEIGHT, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      {rules.map(rule => (
        <RulesListItem
          key={rule.id}
          rule={rule}
          onPress={() => onRulePress(rule)}
        />
      ))}
      {isLoading && (
        <View
          style={{
            alignItems: 'center',
            paddingVertical: 20,
          }}
        >
          <AnimatedLoading style={{ width: 20, height: 20 }} />
        </View>
      )}
    </View>
  );
}
