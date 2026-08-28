import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useGlobalPref } from '#hooks/useGlobalPref';
import { useNavigate } from '#hooks/useNavigate';
import { useNewsFeed } from '#hooks/useNewsFeed';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

import { getNewestDate, getReleaseToNotify } from './utils';

export const NEWS_RELEASE_NOTIFICATION_ID = 'news-release-notification';

/**
 * Shows a sticky notification the first time a new release (that the user is
 * already running) appears in the news feed. Does nothing while the
 * `newsFeed` experimental flag is off.
 */
export function useNewsNotification() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isEnabled, entries, markAllSeen } = useNewsFeed();
  const [lastSeenNewsDate, setLastSeenNewsDate] =
    useGlobalPref('lastSeenNewsDate');

  useEffect(() => {
    if (!isEnabled || entries.length === 0) {
      return;
    }

    if (!lastSeenNewsDate) {
      // First time the feature is enabled: don't notify about old news, just
      // remember where we are so future releases trigger a notification.
      const newestDate = getNewestDate(entries);
      if (newestDate) {
        setLastSeenNewsDate(newestDate);
      }
      return;
    }

    const release = getReleaseToNotify(
      entries,
      window.Actual.ACTUAL_VERSION,
      lastSeenNewsDate,
    );
    if (!release) {
      return;
    }

    dispatch(
      addNotification({
        notification: {
          type: 'message',
          id: NEWS_RELEASE_NOTIFICATION_ID,
          sticky: true,
          title: t("What's new in Actual {{version}}", {
            version: release.version,
          }),
          message: t(
            'You are now running a new version of Actual. Take a look at what has changed.',
          ),
          button: {
            title: t("See what's new"),
            action: () => {
              void navigate('/whats-new');
            },
          },
          onClose: markAllSeen,
        },
      }),
    );
  }, [
    dispatch,
    entries,
    isEnabled,
    lastSeenNewsDate,
    markAllSeen,
    navigate,
    setLastSeenNewsDate,
    t,
  ]);
}
