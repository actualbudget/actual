import { type ReactNode, useState } from 'react';
import { Trans } from 'react-i18next';

import type { FeatureFlag } from 'loot-core/src/types/prefs';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useSyncedPref } from '../../hooks/useSyncedPref';
import { theme } from '../../style';
import { Link } from '../common/Link';
import { Text } from '../common/Text';
import { View } from '../common/View';
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

  return (
    <Setting
      primaryAction={
        expanded ? (
          <View style={{ gap: '1em' }}>
            <FeatureToggle flag="goalTemplatesEnabled">
              <Trans>Goal templates</Trans>
            </FeatureToggle>
            <FeatureToggle
              flag="actionTemplating"
              feedbackLink="https://github.com/actualbudget/actual/issues/3606"
            >
              <Trans>Rule action templating</Trans>
            </FeatureToggle>
            <FeatureToggle
              flag="upcomingLengthAdjustment"
              feedbackLink="https://github.com/actualbudget/actual/issues/3660"
            >
              <Trans>Scheduled transaction upcoming length adjustment</Trans>
            </FeatureToggle>
            <FeatureToggle
              flag="contextMenus"
              feedbackLink="https://github.com/actualbudget/actual/issues/3706"
            >
              <Trans>Context menus</Trans>
            </FeatureToggle>
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
