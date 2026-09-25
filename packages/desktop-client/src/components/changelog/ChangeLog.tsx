import React, { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { getNormalisedString } from '@actual-app/core/shared/normalisation';
import { useInfiniteQuery } from '@tanstack/react-query';

import { changeLogQueries } from '#changelog';
import { InfiniteScrollWrapper } from '#components/common/InfiniteScrollWrapper';
import { Search } from '#components/common/Search';

import { ChangeLogHeader } from './ChangeLogHeader';
import { ChangeLogList } from './ChangeLogList';
import { ChangeLogNotice } from './ChangeLogNotice';

export function ChangeLog() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('');

  const {
    data: pages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isError,
  } = useInfiniteQuery(changeLogQueries.list());

  const entries = useMemo(
    () => (pages ?? []).flatMap(page => page.entries),
    [pages],
  );

  const lastPage = pages?.[pages.length - 1];
  const currentClientId = lastPage?.currentClientId ?? '';
  const isRecording = lastPage?.isRecording ?? true;

  // A page can legitimately come back empty: edits that touch only columns the
  // log does not display are dropped, and a reorder or bank sync can produce a
  // long run of them. With no rows there is nothing to scroll, so `loadMore`
  // would never fire -- keep pulling until there is something to show.
  useEffect(() => {
    if (
      !isPending &&
      entries.length === 0 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
  }, [
    entries.length,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  ]);

  const filteredEntries = useMemo(() => {
    if (filter === '') {
      return entries;
    }

    const needle = getNormalisedString(filter);

    return entries.filter(entry =>
      [entry.before, entry.after]
        .flatMap(snapshot =>
          snapshot
            ? [
                snapshot.date,
                snapshot.accountName,
                snapshot.payeeName,
                snapshot.notes,
                snapshot.categoryName,
              ]
            : [],
        )
        .some(
          candidate =>
            candidate && getNormalisedString(candidate).includes(needle),
        ),
    );
  }, [entries, filter]);

  return (
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
          <Text>
            <Trans>
              Every change made to a transaction, newest first. History is kept
              only back to the last sync reset, and is not included in backups.
            </Trans>
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        <Search
          placeholder={t('Filter loaded changes...')}
          value={filter}
          onChange={setFilter}
        />
      </View>

      {!isRecording && <ChangeLogNotice />}

      <View style={styles.tableContainer}>
        <ChangeLogHeader />
        <InfiniteScrollWrapper
          loadMore={() => {
            if (hasNextPage && !isFetchingNextPage) {
              void fetchNextPage();
            }
          }}
        >
          {isPending || (entries.length === 0 && isFetchingNextPage) ? (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <AnimatedLoading style={{ width: 25, height: 25 }} />
            </View>
          ) : isError ? (
            <View
              style={{
                textAlign: 'center',
                color: theme.errorText,
                fontSize: 13,
                padding: 20,
              }}
            >
              <Trans>Unable to load the change log.</Trans>
            </View>
          ) : filteredEntries.length === 0 ? (
            <View
              style={{
                textAlign: 'center',
                color: theme.pageTextSubdued,
                fontStyle: 'italic',
                fontSize: 13,
                padding: 20,
              }}
            >
              {entries.length === 0 ? (
                <Trans>
                  No changes recorded yet. A budget restored from a backup
                  starts with an empty history.
                </Trans>
              ) : (
                <Trans>No changes match this filter</Trans>
              )}
            </View>
          ) : (
            <ChangeLogList
              entries={filteredEntries}
              currentClientId={currentClientId}
            />
          )}
        </InfiniteScrollWrapper>
      </View>
    </View>
  );
}
