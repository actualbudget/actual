import React, { useCallback, useMemo, type CSSProperties } from 'react';
import { ListBox } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type RuleEntity } from 'loot-core/types/models';

import { RulesListItem } from './RulesListItem';

type LoadingProps = {
  style?: CSSProperties;
  'aria-label': string;
};

function Loading({ style, 'aria-label': ariaLabel }: LoadingProps) {
  const { t } = useTranslation();
  return (
    <View
      aria-label={ariaLabel || t('Loading...')}
      style={{
        backgroundColor: theme.mobilePageBackground,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        ...style,
      }}
    >
      <AnimatedLoading width={25} height={25} />
    </View>
  );
}

type RulesListProps = {
  isLoading: boolean;
  rules: readonly RuleEntity[];
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onRulePress?: (rule: RuleEntity) => void;
};

export function RulesList({
  isLoading,
  rules,
  isLoadingMore,
  onLoadMore,
  onRulePress,
}: RulesListProps) {
  const { t } = useTranslation();

  const handleRulePress = useCallback(
    (rule: RuleEntity) => {
      if (onRulePress) {
        onRulePress(rule);
      }
    },
    [onRulePress],
  );

  if (isLoading) {
    return <Loading aria-label={t('Loading rules...')} />;
  }

  return (
    <>
      <ListBox
        aria-label={t('Rules list')}
        selectionMode="single"
        renderEmptyState={() => (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.mobilePageBackground,
              padding: 20,
            }}
          >
            <Text style={{ fontSize: 15, color: theme.pageTextSubdued }}>
              <Trans>No rules</Trans>
            </Text>
          </View>
        )}
        items={rules}
      >
        {rule => (
          <RulesListItem
            key={rule.id}
            value={rule}
            onPress={handleRulePress}
          />
        )}
      </ListBox>

      {isLoadingMore && (
        <Loading
          aria-label={t('Loading more rules...')}
          style={{
            height: 60,
          }}
        />
      )}
    </>
  );
}