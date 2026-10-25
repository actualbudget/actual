import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import type { TFunction } from 'i18next';

import type { GoalFundingState } from './util';

export type GoalRing = {
  state: Exclude<GoalFundingState, 'overspent'>;
  /** How much of the goal is funded, as a whole percentage from 0 to 100 */
  progress: number;
};

type GoalProgressRingProps = GoalRing & {
  size?: number;
  style?: CSSProperties;
};

const RADIUS = 5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function getGoalRingLabel({ state, progress }: GoalRing, t: TFunction) {
  return state === 'funded'
    ? t('Fully funded')
    : t('Underfunded, {{progress}}% of goal', { progress });
}

/**
 * A ring that fills up as a category's goal is funded and becomes a check
 * once it is met. It sits beside the balance, which keeps its usual colour,
 * so the shape carries the status rather than the number.
 */
export function GoalProgressRing({
  state,
  progress,
  size = 12,
  style,
}: GoalProgressRingProps) {
  const { t } = useTranslation();
  const label = getGoalRingLabel({ state, progress }, t);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      role="img"
      aria-label={label}
      data-goal-status={state}
      data-goal-progress={progress}
      style={{ flexShrink: 0, ...style }}
    >
      <title>{label}</title>
      {state === 'funded' ? (
        <>
          <circle cx="6" cy="6" r="6" fill={theme.templateNumberFunded} />
          <path
            d="M3.5 6.2 5.3 8 8.6 4.4"
            fill="none"
            stroke={theme.tableBackground}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <circle
            cx="6"
            cy="6"
            r={RADIUS}
            fill="none"
            stroke={theme.tableBorder}
            strokeWidth="2"
          />
          {progress > 0 && (
            <circle
              cx="6"
              cy="6"
              r={RADIUS}
              fill="none"
              stroke={theme.templateNumberUnderFunded}
              strokeWidth="2"
              strokeDasharray={`${(CIRCUMFERENCE * progress) / 100} ${CIRCUMFERENCE}`}
              transform="rotate(-90 6 6)"
            />
          )}
        </>
      )}
    </svg>
  );
}
