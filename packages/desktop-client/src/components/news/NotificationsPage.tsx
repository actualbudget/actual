import { useEffect, useEffectEvent, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
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
const DISCORD_URL = 'https://discord.gg/pRYNYr4W5A';

export function NotificationsPage() {
  const { t } = useTranslation();
  const {
    entries,
    isLoading,
    errorKind,
    retry,
    lastSeenNewsDate,
    markAllSeen,
  } = useNewsFeed();

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
    <Page header={t('Notifications')}>
      <View
        style={{
          marginTop: 10,
          flexShrink: 0,
          gap: 30,
          // Keeps lines of text to a comfortable reading length.
          maxWidth: 800,
          paddingBottom: MOBILE_NAV_HEIGHT,
        }}
      >
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

        {/* The settings card is reused on purpose so this page matches Settings. */}
        {errorKind === 'unavailable' && (
          <Setting
            primaryAction={
              <Button onPress={retry}>
                <Trans>Try again</Trans>
              </Button>
            }
          >
            <Text>
              <Trans>
                <strong>Notifications aren't available right now.</strong>{' '}
                Actual couldn't load them, which usually means you're offline.
                Everything else keeps working, and they'll load next time you're
                connected.
              </Trans>
            </Text>
          </Setting>
        )}

        {errorKind === 'unsupported' && (
          <Setting>
            <Text>
              <Trans>
                <strong>Update Actual to see the latest notifications.</strong>{' '}
                This version can't read the newest notifications format.
              </Trans>
            </Text>
          </Setting>
        )}

        {!isLoading && !errorKind && entries.length === 0 && (
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

        <View
          style={{
            flexDirection: 'row',
            gap: 16,
            flexWrap: 'wrap',
            fontSize: 13,
          }}
        >
          <Link variant="external" to={RELEASE_NOTES_URL} linkColor="purple">
            <Trans>All release notes</Trans>
          </Link>
          <Link variant="external" to={BLOG_URL} linkColor="purple">
            <Trans>Blog</Trans>
          </Link>
          <Link variant="external" to={DISCORD_URL} linkColor="purple">
            <Trans>Community (Discord)</Trans>
          </Link>
        </View>
      </View>
    </Page>
  );
}
