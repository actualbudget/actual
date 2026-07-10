import { Trans } from 'react-i18next';

import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';

type ExcludeCurrentMonthToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

// Toggles whether a live range ends at the current month or one month earlier.
export function ExcludeCurrentMonthToggle({
  checked,
  onChange,
}: ExcludeCurrentMonthToggleProps) {
  return (
    <LabeledCheckbox
      id="exclude-current-month"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      style={{ minHeight: 'auto' }}
    >
      <Trans>Exclude current month</Trans>
    </LabeledCheckbox>
  );
}
