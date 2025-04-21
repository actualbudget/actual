import { type ReactNode, useState, useEffect } from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { FeatureFlag } from 'loot-core/types/prefs';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useLocalPref } from '../../hooks/useLocalPref';
import { useSyncedPref } from '../../hooks/useSyncedPref';
import { Link } from '../common/Link';
import { Checkbox } from '../forms';

import { Setting } from './UI';

type FeatureToggleProps = {
  flag: FeatureFlag;
  disableToggle?: boolean;
  error?: ReactNode;
  children: ReactNode;
  feedbackLink?: string;
};

function FeatureToggle({
  flag: flagName,
  disableToggle = false,
  feedbackLink,
  error,
  children,
}: FeatureToggleProps) {
  const enabled = useFeatureFlag(flagName);
  const [_, setFlagPref] = useSyncedPref(`flags.${flagName}`);

  return (
    <label style={{ display: 'flex' }}>
      <Checkbox
        checked={enabled}
        onChange={() => {
          setFlagPref(String(!enabled));
        }}
        disabled={disableToggle}
      />
      <View
        style={{ color: disableToggle ? theme.pageTextSubdued : 'inherit' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {children}
          {feedbackLink && (
            <Link variant="external" to={feedbackLink}>
              <Trans>(give feedback)</Trans>
            </Link>
          )}
        </View>

        {disableToggle && (
          <Text
            style={{
              color: theme.errorText,
              fontWeight: 500,
            }}
          >
            {error}
          </Text>
        )}
      </View>
    </label>
  );
}

export function ExperimentalFeatures() {
  const [expanded, setExpanded] = useState(false);

  const goalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const goalTemplatesUIEnabled = useFeatureFlag('goalTemplatesUIEnabled');
  const showGoalTemplatesUI =
    goalTemplatesUIEnabled ||
    (goalTemplatesEnabled &&
      localStorage.getItem('devEnableGoalTemplatesUI') === 'true');

  const [notificationsEnabled, setNotificationsEnabled] = useLocalPref(
    'notifications.uncategorizedTransactions',
  );
  const [notificationPermissionGranted, setNotificationPermissionGranted] =
    useState(false);
  const [
    notificationServiceWorkerRegistration,
    setNotificationServiceWorkerRegistration,
  ] = useState<ServiceWorkerRegistration | null>(null);

  // Request notification permission
  useEffect(() => {
    if (!notificationsEnabled || !('Notification' in window)) return;

    window.Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        setNotificationPermissionGranted(true);
      } else {
        setNotificationsEnabled(false);
      }
    });
  }, [notificationsEnabled, setNotificationsEnabled]);

  // Register service worker if permission is granted
  useEffect(() => {
    if (!notificationPermissionGranted || !notificationsEnabled) return;

    navigator.serviceWorker
      .register('/push-service-worker.js')
      .then(setNotificationServiceWorkerRegistration)
      .catch(error => {
        setNotificationPermissionGranted(false);
        throw error;
      });
  }, [notificationPermissionGranted, notificationsEnabled]);

  // Unregister service worker if notifications are disabled
  useEffect(() => {
    if (!notificationsEnabled && notificationServiceWorkerRegistration) {
      notificationServiceWorkerRegistration.unregister();
    }
  }, [notificationsEnabled, notificationServiceWorkerRegistration]);

  return (
    <Setting
      primaryAction={
        expanded ? (
          <View style={{ gap: '1em' }}>
            <FeatureToggle flag="goalTemplatesEnabled">
              <Trans>Goal templates</Trans>
            </FeatureToggle>
            {showGoalTemplatesUI && (
              <View style={{ paddingLeft: 22 }}>
                <FeatureToggle flag="goalTemplatesUIEnabled">
                  <Trans>Subfeature: Budget automations UI</Trans>
                </FeatureToggle>
              </View>
            )}
            <FeatureToggle
              flag="actionTemplating"
              feedbackLink="https://github.com/actualbudget/actual/issues/3606"
            >
              <Trans>Rule action templating</Trans>
            </FeatureToggle>
            <FeatureToggle
              flag="contextMenus"
              feedbackLink="https://github.com/actualbudget/actual/issues/3706"
            >
              <Trans>Context menus</Trans>
            </FeatureToggle>
            <FeatureToggle
              flag="openidAuth"
              feedbackLink="https://github.com/actualbudget/actual/issues/4029"
            >
              <Trans>OpenID authentication method</Trans>
            </FeatureToggle>
            <FeatureToggle
              flag="pluggyAiBankSync"
              feedbackLink="https://github.com/actualbudget/actual/pull/4049"
            >
              <Trans>Pluggy.ai Bank Sync (Brazilian banks only)</Trans>
            </FeatureToggle>
            <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Checkbox
                checked={notificationsEnabled}
                onChange={() => setNotificationsEnabled(!notificationsEnabled)}
              />
              <Trans>Push Notifications for Uncategorized Transactions</Trans>
            </label>
          </View>
        ) : (
          <Link
            variant="text"
            onClick={() => setExpanded(true)}
            data-testid="experimental-settings"
            style={{
              flexShrink: 0,
              alignSelf: 'flex-start',
              color: theme.pageTextPositive,
            }}
          >
            <Trans>I understand the risks, show experimental features</Trans>
          </Link>
        )
      }
    >
      <Text>
        <Trans>
          <strong>Experimental features.</strong> These features are not fully
          tested and may not work as expected. THEY MAY CAUSE IRRECOVERABLE DATA
          LOSS. They may do nothing at all. Only enable them if you know what
          you are doing.
        </Trans>
      </Text>
    </Setting>
  );
}
