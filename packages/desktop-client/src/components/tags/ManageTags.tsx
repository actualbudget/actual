import React, { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { listen } from '@actual-app/core/platform/client/connection';
import { getNormalisedString } from '@actual-app/core/shared/normalisation';
import type { TagEntity } from '@actual-app/core/types/models';

import { EmptyMessage } from '#components/common/EmptyMessage';
import { ManagePage } from '#components/common/ManagePage';
import { Search } from '#components/common/Search';
import { useTableNavigator } from '#components/table';
import { SelectedProvider, useSelected } from '#hooks/useSelected';
import { useTags } from '#hooks/useTags';

import { SelectedTagsButton } from './SelectedTagsButton';
import { TagCreationRow } from './TagCreationRow';
import { TagsHeader } from './TagsHeader';
import { TagsList } from './TagsList';
import { TagsMenuButton } from './TagsMenuButton';

export function ManageTags() {
  const [filter, setFilter] = useState('');
  const { data: tags = [], refetch } = useTags();

  useEffect(() => listen('undo-event', () => refetch({ cancelRefetch: true })));

  const filteredTags = useMemo(() => {
    return filter === ''
      ? tags
      : tags.filter(tag =>
          getNormalisedString(tag.tag).includes(getNormalisedString(filter)),
        );
  }, [filter, tags]);

  const selectedInst = useSelected('manage-tags', filteredTags, []);

  return (
    <SelectedProvider instance={selectedInst}>
      <ManageTagsContent
        tags={tags}
        filteredTags={filteredTags}
        filter={filter}
        onFilterChange={setFilter}
      />
    </SelectedProvider>
  );
}

type ManageTagsContentProps = {
  tags: TagEntity[];
  filteredTags: TagEntity[];
  filter: string;
  onFilterChange: (filter: string) => void;
};

// Inside the SelectedProvider so the navigator can clear and toggle checks
function ManageTagsContent({
  tags,
  filteredTags,
  filter,
  onFilterChange,
}: ManageTagsContentProps) {
  const { t } = useTranslation();
  const [hoveredTag, setHoveredTag] = useState<string>();
  const [create, setCreate] = useState(false);
  const tableNavigator = useTableNavigator(filteredTags, [
    'select',
    'tag',
    'color',
    'description',
  ]);

  return (
    <ManagePage
      actions={
        <Button variant="primary" onPress={() => setCreate(true)}>
          <SvgAdd width={10} height={10} style={{ marginRight: spacing.xs }} />
          <Trans>Add new tag</Trans>
        </Button>
      }
      search={
        <Search
          placeholder={t('Filter tags…')}
          width="100%"
          value={filter}
          onChange={onFilterChange}
        />
      }
      selection={
        <SelectedTagsButton onRename={id => tableNavigator.onEdit(id, 'tag')} />
      }
      menu={<TagsMenuButton />}
    >
      <View style={styles.tableContainer}>
        <TagsHeader />
        {create && (
          <TagCreationRow onClose={() => setCreate(false)} tags={tags} />
        )}
        {tags.length ? (
          <TagsList
            navigator={tableNavigator}
            tags={filteredTags}
            hoveredTag={hoveredTag}
            onHover={id => setHoveredTag(id ?? undefined)}
          />
        ) : (
          <EmptyMessage>
            <Trans>No tags</Trans>
          </EmptyMessage>
        )}
      </View>
    </ManagePage>
  );
}
