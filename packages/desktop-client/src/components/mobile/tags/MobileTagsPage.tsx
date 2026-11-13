import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { getNormalisedString } from '@actual-app/core/shared/normalisation';
import type { TagEntity } from '@actual-app/core/types/models';

import { Search } from '#components/common/Search';
import { withFilterParam } from '#components/mobile/utils';
import { MobilePageHeader, Page } from '#components/Page';
import { SettingsBackButton } from '#components/settings/SettingsBackButton';
import { useNavigate } from '#hooks/useNavigate';
import { useTags } from '#hooks/useTags';
import { useUndo } from '#hooks/useUndo';
import { useUrlParam } from '#hooks/useUrlParam';
import { useDeleteTagMutation } from '#tags';

import { AddTagButton } from './AddTagButton';
import { TagsList } from './TagsList';
import { getTagTransactionsLocationState } from './utils';

export function MobileTagsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { showUndoNotification } = useUndo();
  const { data: tags = [], isPlaceholderData, isPending } = useTags();
  const { mutateAsync: deleteTag } = useDeleteTagMutation();
  const [filterParam, setFilterParam] = useUrlParam('filter');
  const [filter, setFilter] = useState(filterParam ?? '');

  useEffect(() => {
    setFilter(filterParam ?? '');
  }, [filterParam]);

  const normalisedFilter = getNormalisedString(filter.replace(/^#/, ''));
  const filteredTags =
    normalisedFilter === ''
      ? tags
      : tags.filter(
          tag =>
            getNormalisedString(tag.tag).includes(normalisedFilter) ||
            getNormalisedString(tag.description ?? '').includes(
              normalisedFilter,
            ),
        );

  const onSearchChange = (value: string) => {
    setFilter(value);
    setFilterParam(value, { replace: true });
  };

  const onTagPress = (tag: TagEntity) => {
    void navigate(`/tags/${tag.id}${withFilterParam(location.search, filter)}`);
  };

  const onTagViewTransactions = (tag: TagEntity) => {
    void navigate('/accounts', {
      state: getTagTransactionsLocationState(tag.tag),
    });
  };

  const onTagDelete = async (tag: TagEntity) => {
    try {
      await deleteTag({ id: tag.id });
    } catch {
      return;
    }
    showUndoNotification({
      message: t('Tag "{{name}}" deleted', { name: `#${tag.tag}` }),
    });
  };

  return (
    <Page
      header={
        <MobilePageHeader
          title={t('Tags')}
          leftContent={<SettingsBackButton />}
          rightContent={<AddTagButton />}
        />
      }
      padding={0}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.mobilePageBackground,
          padding: 10,
          width: '100%',
          borderBottomWidth: 2,
          borderBottomStyle: 'solid',
          borderBottomColor: theme.tableBorder,
        }}
      >
        <Search
          placeholder={t('Filter tags…')}
          value={filter}
          onChange={onSearchChange}
          width="100%"
          height={styles.mobileMinHeight}
          style={{
            backgroundColor: theme.tableBackground,
            borderColor: theme.formInputBorder,
          }}
        />
      </View>
      <TagsList
        tags={filteredTags}
        isLoading={isPending || isPlaceholderData}
        isFiltered={normalisedFilter !== ''}
        onTagPress={onTagPress}
        onTagDelete={onTagDelete}
        onTagViewTransactions={onTagViewTransactions}
      />
    </Page>
  );
}
