import { useEffect, useEffectEvent, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Link } from '#components/common/Link';
import { MOBILE_NAV_HEIGHT } from '#components/mobile/MobileNavTabs';
import { Page } from '#components/Page';
import { Setting } from '#components/settings/UI';
import { useNewsFeed } from '#hooks/useNewsFeed';
import { getUnseenEntries } from '#news/utils';

import { NewsEntryCard } from './NewsEntryCard';

const RELEASE_NOTES_URL = 'https://actualbudget.org/docs/releases';
const BLOG_URL = 'https://actualbudget.org/blog';

export function WhatsNewPage() {
  const { t } = useTranslation();
  const { entries, isLoading, error, lastSeenNewsDate, markAllSeen } =
    useNewsFeed();

  // Everything is marked as seen once the page shows it, but the unread
  // markers should reflect what was new when the page opened, so remember the
  // starting point.
  const lastSeenOnOpen = useRef(lastSeenNewsDate);
  const unseenOnOpen = new Set(
    getUnseenEntries(entries, lastSeenOnOpen.current).map(entry => entry.id),
  );

  const markSeen = useEffectEvent(markAllSeen);
  useEffect(() => {
    if (entries.length > 0) {
      markSeen();
    }
  }, [entries]);

  return (
    <Page header={t("What's new")}>
      <View
        style={{
          marginTop: 10,
          flexShrink: 0,
          gap: 30,
          maxWidth: 800,
          paddingBottom: MOBILE_NAV_HEIGHT,
        }}
      >
        {/* The settings card is reused on purpose so this page matches Settings. */}
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
            <AnimatedLoading
              style={{
                width: 20,
                height: 20,
                color: theme.pageTextDark,
                ...styles.delayedFadeIn,
              }}
            />
          </View>
        )}

        {error && (
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
            isUnread={unseenOnOpen.has(entry.id)}
          />
        ))}
      </View>
    </Page>
  );
}
