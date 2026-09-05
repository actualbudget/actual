import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgNotificationsOutline } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import { useNavigate } from '#hooks/useNavigate';
import { useNewsFeed } from '#hooks/useNewsFeed';

// Keeps the badge small; the feed only ever holds a couple of dozen entries.
const MAX_DISPLAYED_COUNT = 9;

/**
 * Titlebar bell that opens the Notifications page and shows how many entries
 * (releases and posts) the user hasn't seen yet. Hidden while the news feed
 * is disabled (the user turned it off in settings).
 */
export function NotificationsButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isEnabled, unseenCount } = useNewsFeed();

  if (!isEnabled) {
    return null;
  }

  const label =
    unseenCount > 0
      ? t('Notifications: {{count}} unread', { count: unseenCount })
      : t('Notifications');
  const displayedCount =
    unseenCount > MAX_DISPLAYED_COUNT
      ? `${MAX_DISPLAYED_COUNT}+`
      : String(unseenCount);

  return (
    <Tooltip placement="bottom end" content={label}>
      <View style={{ position: 'relative' }}>
        <Button
          variant="bare"
          aria-label={label}
          onPress={() => void navigate('/notifications')}
          data-testid="notifications-button"
        >
          <SvgNotificationsOutline style={{ width: 15, height: 15 }} />
        </Button>
        {unseenCount > 0 && (
          <Text
            data-testid="notifications-unseen-count"
            style={{
              position: 'absolute',
              top: -3,
              right: -9,
              minWidth: 16,
              height: 16,
              lineHeight: '16px',
              padding: '0 4px',
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 700,
              textAlign: 'center',
              backgroundColor: theme.buttonPrimaryBackground,
              color: theme.buttonPrimaryText,
              pointerEvents: 'none',
            }}
          >
            {displayedCount}
          </Text>
        )}
      </View>
    </Tooltip>
  );
}
