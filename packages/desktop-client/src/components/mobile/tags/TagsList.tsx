import { GridList, ListLayout, Virtualizer } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { TagEntity } from '@actual-app/core/types/models';

import { MOBILE_NAV_HEIGHT } from '#components/mobile/MobileNavTabs';

import { TagsListItem } from './TagsListItem';

type TagsListProps = {
  tags: TagEntity[];
  isLoading?: boolean;
  isFiltered?: boolean;
  onTagPress: (tag: TagEntity) => void;
  onTagDelete: (tag: TagEntity) => void;
  onTagViewTransactions: (tag: TagEntity) => void;
};

export function TagsList({
  tags,
  isLoading = false,
  isFiltered = false,
  onTagPress,
  onTagDelete,
  onTagViewTransactions,
}: TagsListProps) {
  const { t } = useTranslation();

  if (isLoading && tags.length === 0) {
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

  if (tags.length === 0) {
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
            color: theme.pageTextLight,
            textAlign: 'center',
          }}
        >
          {isFiltered ? (
            <Trans>No tags found.</Trans>
          ) : (
            <Trans>No tags yet.</Trans>
          )}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Virtualizer layout={ListLayout}>
        <GridList
          aria-label={t('Tags')}
          aria-busy={isLoading || undefined}
          items={tags}
          style={{
            flex: 1,
            paddingBottom: MOBILE_NAV_HEIGHT,
            overflow: 'auto',
          }}
          dependencies={[onTagPress, onTagDelete, onTagViewTransactions]}
        >
          {tag => (
            <TagsListItem
              value={tag}
              onAction={() => onTagPress(tag)}
              onDelete={() => onTagDelete(tag)}
              onViewTransactions={() => onTagViewTransactions(tag)}
            />
          )}
        </GridList>
      </Virtualizer>
    </View>
  );
}
