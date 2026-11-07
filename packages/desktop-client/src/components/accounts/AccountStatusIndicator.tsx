import { useTranslation } from 'react-i18next';

import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, keyframes } from '@emotion/css';

/**
 * Sync-status "dot grammar": fill = connection, motion = activity.
 *
 *   synced  → solid dot            manual → hollow dot
 *   syncing → dot + orbiting arc   error  → solid dot in a pulsing ring
 */
export type AccountSyncStatus = 'synced' | 'syncing' | 'error' | 'manual';

const orbit = keyframes({
  to: { transform: 'rotate(360deg)' },
});

const ringPulse = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.35 },
});

const orbitClassName = css({
  transformOrigin: '24px 24px',
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${orbit} 0.95s linear infinite`,
  },
});

const ringPulseClassName = css({
  transformOrigin: 'center',
  '@media (prefers-reduced-motion: no-preference)': {
    animation: `${ringPulse} 1.7s ease-in-out infinite`,
  },
});

const STATUS_COLORS: Record<AccountSyncStatus, string> = {
  synced: theme.noticeText,
  syncing: theme.warningText,
  error: theme.errorText,
  manual: theme.pageTextSubdued,
};

export function AccountStatusIndicator({
  status,
  size = 15,
  style,
}: {
  status: AccountSyncStatus;
  size?: number;
  style?: CSSProperties;
}) {
  const { t } = useTranslation();
  const label: Record<AccountSyncStatus, string> = {
    synced: t('Synced'),
    syncing: t('Syncing'),
    error: t('Sync error'),
    manual: t('Manual account'),
  };

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: STATUS_COLORS[status],
        ...style,
      }}
    >
      <svg
        aria-label={label[status]}
        viewBox="0 0 48 48"
        width="100%"
        height="100%"
        style={{ overflow: 'visible' }}
      >
        {status === 'synced' && (
          <circle cx={24} cy={24} r={9} fill="currentColor" />
        )}
        {status === 'syncing' && (
          <>
            <circle cx={24} cy={24} r={4.6} fill="currentColor" />
            <g className={orbitClassName}>
              <path
                d="M24 24m-11,0 a11,11 0 0 1 19.5,-6.8"
                fill="none"
                stroke="currentColor"
                strokeWidth={3.4}
                strokeLinecap="round"
              />
            </g>
          </>
        )}
        {status === 'error' && (
          <>
            <circle cx={24} cy={24} r={6.5} fill="currentColor" />
            <circle
              className={ringPulseClassName}
              cx={24}
              cy={24}
              r={13}
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
            />
          </>
        )}
        {status === 'manual' && (
          <circle
            cx={24}
            cy={24}
            r={8}
            fill="none"
            stroke="currentColor"
            strokeWidth={3.4}
          />
        )}
      </svg>
    </View>
  );
}
