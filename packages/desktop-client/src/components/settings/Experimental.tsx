import { type ReactNode, useState } from 'react';
import { useSelector } from 'react-redux';

import { type State } from 'loot-core/client/state-types';
import type { FeatureFlag, LocalPrefs } from 'loot-core/src/types/prefs';

import { useActions } from '../../hooks/useActions';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
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
};

function FeatureToggle({
  flag,
  disableToggle = false,
  error,
  children,
}: FeatureToggleProps) {
  const { savePrefs } = useActions();
  const enabled = useFeatureFlag(flag);

  return (
    <label style={{ display: 'flex' }}>
      <Checkbox
        checked={enabled}
        onChange={() => {
          // @ts-expect-error key type is not correctly inferred
          savePrefs({
            [`flags.${flag}`]: !enabled,
          });
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
  const budgetType = useSelector<State, LocalPrefs['budgetType']>(
    state => state.prefs.local?.budgetType,
  );
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
            <FeatureToggle flag="categorySpendingReport">
              Category spending report
            </FeatureToggle>
            <FeatureToggle flag="customReports">Custom reports</FeatureToggle>
            <FeatureToggle flag="sankeyReport">Sankey report</FeatureToggle>

            <ReportBudgetFeature />

            <FeatureToggle flag="goalTemplatesEnabled">
              Goal templates
            </FeatureToggle>
            <FeatureToggle flag="simpleFinSync">SimpleFIN sync</FeatureToggle>
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
