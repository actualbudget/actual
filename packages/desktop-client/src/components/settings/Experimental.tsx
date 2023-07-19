import { type ReactNode, useState } from 'react';
import { useSelector } from 'react-redux';

import type { FeatureFlag } from 'loot-core/src/client/state-types/prefs';

import { useActions } from '../../hooks/useActions';
import useFeatureFlag from '../../hooks/useFeatureFlag';
import { colors } from '../../style';
import { LinkButton, Text, View } from '../common';
import { Checkbox } from '../forms';

import { Setting } from './UI';

type FeatureToggleProps = {
  flag: FeatureFlag;
  disableToggle?: boolean;
  children: ReactNode;
};

function FeatureToggle({
  flag,
  disableToggle = false,
  children,
}: FeatureToggleProps) {
  let { savePrefs } = useActions();
  let enabled = useFeatureFlag(flag);

  return (
    <label style={{ display: 'flex' }}>
      <Checkbox
        checked={enabled}
        onChange={() => {
          savePrefs({
            [`flags.${flag}`]: !enabled,
          });
        }}
        disabled={disableToggle}
      />
      {children}
    </label>
  );
}

function ReportBudgetFeature() {
  let budgetType = useSelector(state => state.prefs.local?.budgetType);
  let enabled = useFeatureFlag('reportBudget');
  let blockToggleOff = budgetType === 'report' && enabled;
  return (
    <FeatureToggle flag="reportBudget" disableToggle={blockToggleOff}>
      <View style={{ color: blockToggleOff ? colors.n5 : 'inherit' }}>
        Budget mode toggle
        {blockToggleOff && (
          <Text style={{ color: colors.r3, fontWeight: 500 }}>
            Switch to a rollover budget before turning off this feature
          </Text>
        )}
      </View>
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
            <ReportBudgetFeature />

            <FeatureToggle flag="goalTemplatesEnabled">
              Goal templates
            </FeatureToggle>

            <FeatureToggle flag="privacyMode">Privacy mode</FeatureToggle>
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
