import { useSelector } from 'react-redux';

import { selectValueColorization } from 'loot-core/client/selectors';

import { type CSSProperties, theme } from '../../style';

export function useBalanceValueColorization() {
  return useSelector(selectValueColorization);
}

export function makeAmountGrey(value: number | string): CSSProperties {
  return value === 0 || value === '0' || value === '' || value == null
    ? { color: theme.tableTextSubdued }
    : null;
}

export function makeBalanceAmountStyle(
  colorize: boolean,
  value: number,
  goalValue?: number,
  budgetedValue?: number,
): CSSProperties {
  if (value < 0) {
    return colorize ? { color: theme.errorText } : null;
  }

  if (goalValue == null) {
    const greyed = makeAmountGrey(value);
    return greyed ?? (colorize ? { color: theme.noticeText } : null);
  } else {
    if (budgetedValue < goalValue) {
      return { color: theme.warningText };
    }
    return { color: theme.noticeText };
  }
}

export function makeAmountFullStyle(
  colorize: boolean,
  value: number | string,
  colors?: {
    positiveColor?: string;
    negativeColor?: string;
    zeroColor?: string;
  },
): CSSProperties {
  const zeroColorToUse = colors?.zeroColor || theme.tableTextSubdued;
  if (typeof value === 'string' || value === 0) {
    return { color: zeroColorToUse };
  }

  if (!colorize) {
    return null;
  }

  const positiveColorToUse = colors?.positiveColor || theme.noticeText;
  const negativeColorToUse = colors?.negativeColor || theme.errorText;
  return {
    color: value < 0 ? negativeColorToUse : positiveColorToUse,
  };
}
