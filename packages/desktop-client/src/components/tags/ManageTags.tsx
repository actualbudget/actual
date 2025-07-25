import React, { useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';
import { SvgSearchAlternate } from '@actual-app/components/icons/v2';
import { Stack } from '@actual-app/components/stack';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { getNormalisedString } from 'loot-core/shared/normalisation';

import { TagCreationRow } from './TagCreationRow';
import { TagsHeader } from './TagsHeader';
import { TagsList } from './TagsList';

import { Search } from '@desktop-client/components/common/Search';
import {
  SelectedProvider,
  useSelected,
} from '@desktop-client/hooks/useSelected';
import { deleteAllTags, findTags } from '@desktop-client/queries/queriesSlice';
import { useDispatch } from '@desktop-client/redux';
import { useTags } from '@desktop-client/style/tags';

export function ManageTags() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [filter, setFilter] = useState('');
  const [hoveredTag, setHoveredTag] = useState<string>();
  const [create, setCreate] = useState(false);
  const tags = useTags();

  const filteredTags = useMemo(() => {
    return filter === ''
      ? tags
      : tags.filter(tag =>
          getNormalisedString(tag.tag).includes(getNormalisedString(filter)),
        );
  }, [filter, tags]);

  const selectedInst = useSelected('manage-tags', filteredTags, []);

  const onDeleteSelected = useCallback(async () => {
    dispatch(deleteAllTags([...selectedInst.items]));
    selectedInst.dispatch({ type: 'select-none' });
  }, [dispatch, selectedInst]);

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
        <Stack
          spacing={2}
          direction="row"
          align="center"
          style={{ marginTop: 12 }}
        >
          <Button variant="bare" onPress={() => setCreate(true)}>
            <SvgAdd width={10} height={10} style={{ marginRight: 3 }} />
            <Trans>Add New</Trans>
          </Button>
          <Button variant="bare" onPress={() => dispatch(findTags())}>
            <SvgSearchAlternate
              width={10}
              height={10}
              style={{ marginRight: 3 }}
            />
            <Trans>Find Existing Tags</Trans>
          </Button>
          <View style={{ flex: 1 }} />
          <Search
            placeholder={t('Filter tags...')}
            value={filter}
            onChange={setFilter}
          />
        </Stack>
        <View style={{ flex: 1, marginTop: 12 }}>
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
                <Trans count={selectedInst.items.size}>
                  Delete {selectedInst.items.size} tags
                </Trans>
              </Button>
            )}
          </Stack>
        </View>
      </View>
    </SelectedProvider>
  );
}
