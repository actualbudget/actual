import React, { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { listen } from '@actual-app/core/platform/client/connection';
import { getNormalisedString } from '@actual-app/core/shared/normalisation';

import { Search } from '#components/common/Search';
import { SelectedProvider, useSelected } from '#hooks/useSelected';
import { useTags } from '#hooks/useTags';

import { SelectedTagsButton } from './SelectedTagsButton';
import { TagCreationRow } from './TagCreationRow';
import { TagsHeader } from './TagsHeader';
import { TagsList } from './TagsList';
import { TagsMenuButton } from './TagsMenuButton';

export function ManageTags() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');
  const [hoveredTag, setHoveredTag] = useState<string>();
  const [create, setCreate] = useState(false);
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
      <View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: '0 0 15px',
            flexShrink: 0,
          }}
        >
          <View
            style={{
              color: theme.pageTextLight,
              flexDirection: 'row',
              alignItems: 'center',
              width: '50%',
            }}
          >
            <Trans>User defined tags with color and description.</Trans>
          </View>
        </View>
        <SpaceBetween gap={10} style={{ marginTop: 12, alignItems: 'center' }}>
          <Button variant="bare" onPress={() => setCreate(true)}>
            <SvgAdd width={10} height={10} style={{ marginRight: 3 }} />
            <Trans>Add New</Trans>
          </Button>
          <View style={{ flex: 1 }} />
          <SelectedTagsButton />
          <TagsMenuButton />
          <Search
            placeholder={t('Filter tags...')}
            value={filter}
            onChange={setFilter}
          />
        </SpaceBetween>
        <View style={{ marginTop: 12, ...styles.tableContainer }}>
          <TagsHeader />
          {create && (
            <TagCreationRow onClose={() => setCreate(false)} tags={tags} />
          )}
          {tags.length ? (
            <TagsList
              tags={filteredTags}
              selectedItems={selectedInst.items}
              hoveredTag={hoveredTag}
              onHover={id => setHoveredTag(id ?? undefined)}
            />
          ) : (
            <View
              style={{
                background: theme.tableBackground,
                fontStyle: 'italic',
              }}
            >
              <Text style={{ margin: 'auto', padding: '20px' }}>
                <Trans>No Tags</Trans>
              </Text>
            </View>
          )}
        </View>
      </View>
    </SelectedProvider>
  );
}
