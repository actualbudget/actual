import { type ReactNode, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import type { FeatureFlag } from 'loot-core/src/types/prefs';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useSyncedPref } from '../../hooks/useSyncedPref';
import { theme } from '../../style';
import { Link } from '../common/Link';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Checkbox } from '../forms';
import { useLoginMethod } from '../ServerContext';

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
          setFlagPref(!enabled);
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

function ReportBudgetFeature() {
  const { t } = useTranslation();
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const enabled = useFeatureFlag('reportBudget');
  const blockToggleOff = budgetType === 'report' && enabled;
  return (
    <FeatureToggle
      flag="reportBudget"
      disableToggle={blockToggleOff}
      error={t('Switch to a rollover budget before turning off this feature')}
      feedbackLink="https://github.com/actualbudget/actual/issues/2999"
    >
      <Trans>Budget mode toggle</Trans>
    </FeatureToggle>
  );
}

export function ExperimentalFeatures() {
  const [expanded, setExpanded] = useState(false);
  const loginMethod = useLoginMethod();

  return (
    <Setting
      primaryAction={
        expanded ? (
          <View style={{ gap: '1em' }}>
            <FeatureToggle
              flag="spendingReport"
              feedbackLink="https://github.com/actualbudget/actual/issues/2820"
            >
              <Trans>Monthly spending report</Trans>
            </FeatureToggle>

            <ReportBudgetFeature />

            <FeatureToggle flag="goalTemplatesEnabled">
              <Trans>Goal templates</Trans>
            </FeatureToggle>
            <FeatureToggle
              flag="simpleFinSync"
              feedbackLink="https://github.com/actualbudget/actual/issues/2272"
            >
              <Trans>SimpleFIN sync</Trans>
            </FeatureToggle>
            <FeatureToggle
              flag="dashboards"
              feedbackLink="https://github.com/actualbudget/actual/issues/3282"
            >
              <Trans>Customizable reports page (dashboards)</Trans>
            </FeatureToggle>
            <FeatureToggle
              flag="openidAuth"
              disableToggle={loginMethod === 'openid'}
              feedbackLink="https://github.com/actualbudget/actual/issues/524"
            >
              <Trans>OpenID authentication method</Trans>
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
