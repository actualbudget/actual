import { type ReactNode, useState } from 'react';

import type { FeatureFlag } from 'loot-core/src/types/prefs';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useLocalPref } from '../../hooks/useLocalPref';
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
};

function FeatureToggle({
  flag: flagName,
  disableToggle = false,
  error,
  children,
}: FeatureToggleProps) {
  const enabled = useFeatureFlag(flagName);
  const [_, setFlagPref] = useLocalPref(`flags.${flagName}`);

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
        {children}
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
  const [budgetType] = useLocalPref('budgetType');
  const enabled = useFeatureFlag('reportBudget');
  const blockToggleOff = budgetType === 'report' && enabled;
  return (
    <FeatureToggle
      flag="reportBudget"
      disableToggle={blockToggleOff}
      error="Switch to a rollover budget before turning off this feature"
    >
      Budget mode toggle
    </FeatureToggle>
  );
}

export function ExperimentalFeatures() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Setting
      primaryAction={
        expanded ? (
          <View style={{ gap: '1em' }}>
            <FeatureToggle flag="customReports">Custom reports</FeatureToggle>
            <FeatureToggle flag="spendingReport">
              Monthly spending
            </FeatureToggle>

            <ReportBudgetFeature />

            <FeatureToggle flag="goalTemplatesEnabled">
              Goal templates
            </FeatureToggle>
            <FeatureToggle flag="simpleFinSync">SimpleFIN sync</FeatureToggle>
            <FeatureToggle flag="splitsInRules">Splits in rules</FeatureToggle>
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
            I understand the risks, show experimental features
          </Link>
        )
      }
    >
      <Text>
        <strong>Experimental features.</strong> These features are not fully
        tested and may not work as expected. THEY MAY CAUSE IRRECOVERABLE DATA
        LOSS. They may do nothing at all. Only enable them if you know what you
        are doing.
      </Text>
    </Setting>
  );
}
