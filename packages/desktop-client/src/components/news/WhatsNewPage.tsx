import { useEffect, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { Link } from '#components/common/Link';
import { MOBILE_NAV_HEIGHT } from '#components/mobile/MobileNavTabs';
import { Page } from '#components/Page';
import { Setting } from '#components/settings/UI';
import { useNewsFeed } from '#hooks/useNewsFeed';
import { NEWS_RELEASE_NOTIFICATION_ID } from '#news/useNewsNotification';
import { removeNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

import { NewsEntryCard } from './NewsEntryCard';

const RELEASE_NOTES_URL = 'https://actualbudget.org/docs/releases';
const BLOG_URL = 'https://actualbudget.org/blog';

export function WhatsNewPage() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { entries, isLoading, error, lastSeenNewsDate, markAllSeen } =
    useNewsFeed();

  // Remember what "unread" meant when the page opened so the markers don't
  // vanish the moment we record everything as seen.
  const lastSeenOnOpen = useRef(lastSeenNewsDate);

  useEffect(() => {
    dispatch(removeNotification({ id: NEWS_RELEASE_NOTIFICATION_ID }));
  }, [dispatch]);

  useEffect(() => {
    if (entries.length > 0) {
      markAllSeen();
    }
    // Only when the entries arrive/change; `markAllSeen` is derived from them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  return (
    <Page header={t("What's new")}>
      <View
        style={{
          flexDirection: 'column',
          marginTop: 10,
          gap: 30,
          maxWidth: 800,
          paddingBottom: MOBILE_NAV_HEIGHT,
        }}
        data-testid="whats-new-list"
      >
        <Setting>
          <Text>
            <Trans>
              <strong>What's new</strong> shows recent releases and
              announcements from Actual.
            </Trans>
          </Text>
          <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
            <Link variant="external" to={RELEASE_NOTES_URL} linkColor="purple">
              <Trans>All release notes</Trans>
            </Link>
            <Link variant="external" to={BLOG_URL} linkColor="purple">
              <Trans>Blog</Trans>
            </Link>
          </View>
        </Setting>

        {isLoading && (
          <View style={{ alignItems: 'center', padding: 30 }}>
            <AnimatedLoading style={{ width: 20, height: 20 }} />
          </View>
        )}

        {error && !isLoading && (
          <Setting>
            <Text data-testid="whats-new-offline">
              <Trans>
                <strong>The latest news isn't available right now.</strong>{' '}
                Actual couldn't reach actualbudget.org, which usually means
                you're offline. That's fine - everything else in Actual keeps
                working, and the news will load next time you're connected.
              </Trans>
            </Text>
          </Setting>
        )}

        {!isLoading && !error && entries.length === 0 && (
          <Setting>
            <Text>
              <Trans>Nothing new to show yet.</Trans>
            </Text>
          </Setting>
        )}

        {entries.map(entry => (
          <NewsEntryCard
            key={entry.id}
            entry={entry}
            isUnread={
              lastSeenOnOpen.current === undefined
                ? false
                : entry.date > lastSeenOnOpen.current
            }
          />
        ))}
      </View>
    </Page>
  );
}
