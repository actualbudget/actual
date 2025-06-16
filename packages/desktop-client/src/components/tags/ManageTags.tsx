import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Stack } from '@actual-app/components/stack';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { getNormalisedString } from 'loot-core/shared/normalisation';

import { TagsHeader } from './TagsHeader';
import { TagsList } from './TagsList';

import { Search } from '@desktop-client/components/common/Search';
import {
  SelectedProvider,
  useSelected,
} from '@desktop-client/hooks/useSelected';
import { deleteAllTags } from '@desktop-client/queries/queriesSlice';
import { useDispatch } from '@desktop-client/redux';
import { useTags } from '@desktop-client/style/tags';

export function ManageTags() {
  const tags = useTags();
  const [filter, setFilter] = useState('');
  const dispatch = useDispatch();

  const filteredTags = useMemo(() => {
    return filter === ''
      ? tags
      : tags.filter(tag =>
          getNormalisedString(tag.tag).includes(getNormalisedString(filter)),
        );
  }, [filter, tags]);

  const selectedInst = useSelected('manage-tags', filteredTags, []);
  const [hoveredTag, setHoveredTag] = useState<string>();

  const onDeleteSelected = useCallback(async () => {
    dispatch(deleteAllTags([...selectedInst.items]));
    selectedInst.dispatch({ type: 'select-none' });
  }, [dispatch, selectedInst]);

  function onCreateTag() {}

  const { t } = useTranslation();

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
            <Text>{t('User defined tags with color and description.')} </Text>
          </View>
          <View style={{ flex: 1 }} />
          <Search
            placeholder={t('Filter tags...')}
            value={filter}
            onChange={setFilter}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TagsHeader />
          <TagsList
            tags={filteredTags}
            selectedItems={selectedInst.items}
            hoveredTag={hoveredTag}
            onHover={id => setHoveredTag(id ?? undefined)}
          />
        </View>
        <View
          style={{
            paddingBlock: 15,
            paddingInline: 0,
            borderTop: theme.pillBorder,
            flexShrink: 0,
          }}
        >
          <Stack direction="row" align="center" justify="flex-end" spacing={2}>
            {selectedInst.items.size > 0 && (
              <Button onPress={onDeleteSelected}>
                Delete {selectedInst.items.size} tags
              </Button>
            )}
            <Button variant="primary" onPress={onCreateTag} isDisabled={true}>
              {t('Create new tag')}
            </Button>
          </Stack>
        </View>
      </View>
    </SelectedProvider>
  );
}
