import { type ReactNode, useState } from 'react';
import { useSelector } from 'react-redux';

import type { FeatureFlag } from 'loot-core/src/types/prefs';

import { useActions } from '../../hooks/useActions';
import useFeatureFlag from '../../hooks/useFeatureFlag';
import { colors, useTheme } from '../../style';
import LinkButton from '../common/LinkButton';
import Text from '../common/Text';
import View from '../common/View';
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
  let { savePrefs } = useActions();
  let enabled = useFeatureFlag(flag);

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
      <View style={{ color: disableToggle ? colors.n5 : 'inherit' }}>
        {children}
        {disableToggle && (
          <Text style={{ color: colors.r3, fontWeight: 500 }}>{error}</Text>
        )}
      </View>
    </label>
  );
}

function ReportBudgetFeature() {
  let budgetType = useSelector(state => state.prefs.local?.budgetType);
  let enabled = useFeatureFlag('reportBudget');
  let blockToggleOff = budgetType === 'report' && enabled;
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

function ThemeFeature() {
  let theme = useTheme();
  let enabled = useFeatureFlag('themes');
  let blockToggleOff = theme !== 'light' && enabled;
  return (
    <FeatureToggle
      flag="themes"
      disableToggle={blockToggleOff}
      error="Switch to the light theme before turning off this feature"
    >
      Dark mode
    </FeatureToggle>
  );
}

export default function ExperimentalFeatures() {
  let [expanded, setExpanded] = useState(false);

  return (
    <Setting
      primaryAction={
        expanded ? (
          <View style={{ gap: '1em' }}>
            <FeatureToggle flag="categorySpendingReport">
              Category spending report
            </FeatureToggle>

            <ReportBudgetFeature />

            <FeatureToggle flag="goalTemplatesEnabled">
              Goal templates
            </FeatureToggle>

            <FeatureToggle flag="privacyMode">Privacy mode</FeatureToggle>

            <ThemeFeature />
          </View>
        ) : (
          <LinkButton
            onClick={() => setExpanded(true)}
            style={{
              flexShrink: 0,
              alignSelf: 'flex-start',
              color: colors.p4,
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
