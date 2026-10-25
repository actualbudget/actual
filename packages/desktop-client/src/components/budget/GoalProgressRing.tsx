import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import type { TFunction } from 'i18next';

type GoalProgressRingProps = {
  /** How much of the goal is funded, as a whole percentage below 100 */
  progress: number;
  size?: number;
  style?: CSSProperties;
};

const STROKE = 1.5;

export function getGoalRingLabel(progress: number, t: TFunction) {
  return t('Underfunded, {{progress}}% of goal', { progress });
}

/**
 * A small ring beside the balance of a category whose goal is not met yet.
 * It fills like a pie as the goal is funded and is not drawn once it is, so
 * only rows that still need money carry a mark and the amount keeps its
 * usual colour.
 */
export function GoalProgressRing({
  progress,
  size = 10,
  style,
}: GoalProgressRingProps) {
  const { t } = useTranslation();
  const label = getGoalRingLabel(progress, t);
  const center = size / 2;
  const radius = center - STROKE / 2;
  // A circle of half the radius with a stroke as wide as the radius paints a
  // solid disc, so dashing that stroke cuts the disc into a pie wedge
  const wedgeCircumference = Math.PI * radius;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      style={{ flexShrink: 0, ...style }}
    >
      <title>{label}</title>
      {progress > 0 && (
        <circle
          cx={center}
          cy={center}
          r={radius / 2}
          fill="none"
          stroke={theme.templateNumberUnderFunded}
          strokeWidth={radius}
          strokeDasharray={`${(wedgeCircumference * progress) / 100} ${wedgeCircumference}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
      )}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={theme.templateNumberUnderFunded}
        strokeWidth={STROKE}
      />
    </svg>
  );
}
