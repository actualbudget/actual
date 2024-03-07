import { type ReactNode, useState } from 'react';

import type { FeatureFlag } from 'loot-core/src/types/prefs';
import { send } from 'loot-core/platform/client/fetch';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useLocalPref } from '../../hooks/useLocalPref';
import { AnimatedLoading } from '../../icons/AnimatedLoading';
import { theme } from '../../style';
import { LinkButton } from '../common/LinkButton';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Checkbox } from '../forms';

import { Setting } from './UI';

type FeatureToggleProps = {
  flag: FeatureFlag;
  disableToggle?: boolean;
  error?: ReactNode;
  children: ReactNode;
  afterChange?: (newValue: boolean) => void;
};

type FeatureToggleWithLoadingProps = FeatureToggleProps & {
  loading?: boolean;
};

function FeatureToggle({
  flag: flagName,
  disableToggle = false,
  error,
  children,
  afterChange,
}: FeatureToggleProps) {
  const enabled = useFeatureFlag(flagName);
  const [_, setFlagPref] = useLocalPref(`flags.${flagName}`);

  return (
    <label style={{ display: 'flex' }}>
      <Checkbox
        checked={enabled}
        onChange={() => {
          setFlagPref(!enabled);
          afterChange?.(!enabled);
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

function FeatureToggleWithLoading({
  children,
  loading,
  ...featureToggleProps
}: FeatureToggleWithLoadingProps) {
  return (
    <FeatureToggle {...featureToggleProps}>
      {children}
      {loading && (
        <View
          style={{
            position: 'absolute',
            alignSelf: 'flex-end',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
          }}
        >
          <AnimatedLoading style={{ width: 20, height: 20 }} />
        </View>
      )}
    </FeatureToggle>
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

  const [resetting, setResetting] = useState(true);

  async function onResetCache() {
    setResetting(true);
    console.log('Resetting...');
    await send('reset-budget-cache');
    console.log('Done!');
    setResetting(false);
  }

  return (
    <Setting
      primaryAction={
        expanded ? (
          <View style={{ gap: '1em' }}>
            <FeatureToggle flag="customReports">Custom reports</FeatureToggle>

            <ReportBudgetFeature />

            <FeatureToggle flag="goalTemplatesEnabled">
              Goal templates
            </FeatureToggle>
            <FeatureToggle flag="simpleFinSync">SimpleFIN sync</FeatureToggle>
            <FeatureToggle flag="splitsInRules">Splits in rules</FeatureToggle>
            <FeatureToggle
              flag="excludeFutureTransactions"
              loading={resetting}
              afterChange={onResetCache}
            >
              Exclude future transactions from calculations
            </FeatureToggle>
          </View>
        ) : (
          <LinkButton
            onClick={() => setExpanded(true)}
            style={{
              flexShrink: 0,
              alignSelf: 'flex-start',
              color: theme.pageTextPositive,
            }}
          >
            I understand the risks, show experimental features
          </LinkButton>
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
