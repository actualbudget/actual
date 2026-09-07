import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { Link } from '#components/common/Link';
import type { Binding } from '#spreadsheet';

import { CollapseChevron } from './CollapseChevron';
import { CountPill } from './CountPill';
import { SidebarAccountGroup } from './SidebarAccountGroup';
import { SidebarBalance } from './SidebarBalance';
import { sectionLabelStyle } from './styles';
import { SyncErrorRollup } from './SyncErrorRollup';
import type { GroupBucket, SidebarAccountSide } from './useSidebarAccountTree';

type SideGroupProps = {
  label: string;
  side: 'on' | 'off';
  showSyncDot: boolean;
  sideData: SidebarAccountSide;
  totalBinding: Binding<
    'account',
    'onbudget-accounts-balance' | 'offbudget-accounts-balance'
  >;
  balanceTestId: string;
  isOpen: boolean;
  onToggle: () => void;
  isBucketOpen: (bucket: GroupBucket) => boolean;
  onToggleBucket: (bucket: GroupBucket) => void;
};

export function SideGroup({
  label,
  side,
  showSyncDot,
  sideData,
  totalBinding,
  balanceTestId,
  isOpen,
  onToggle,
  isBucketOpen,
  onToggleBucket,
}: SideGroupProps) {
  const { t } = useTranslation();

  return (
    <View style={{ marginTop: spacing.xxs }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          padding: `${spacing.xs}px ${spacing.sm}px ${spacing.xs}px ${spacing.xs}px`,
        }}
      >
        <Button
          variant="bare"
          aria-expanded={isOpen}
          aria-label={
            isOpen
              ? t('Collapse {{section}}', { section: label })
              : t('Expand {{section}}', { section: label })
          }
          onPress={onToggle}
          className={css({
            '&[data-hovered], &[data-focus-visible]': {
              backgroundColor: theme.sidebarItemBackgroundHover,
            },
          })}
          style={{
            padding: spacing.xxs,
            flexShrink: 0,
            borderRadius: radius.sm,
          }}
        >
          <CollapseChevron isOpen={isOpen} />
        </Button>
        <Link
          variant="internal"
          to={side === 'on' ? '/accounts/onbudget' : '/accounts/offbudget'}
          isExactPathMatch
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            flex: 1,
            minWidth: 0,
            textDecoration: 'none',
            color: theme.sidebarItemText,
          }}
          activeStyle={{ color: theme.sidebarItemTextSelected }}
        >
          <Text style={sectionLabelStyle}>{label}</Text>
          {!isOpen && <CountPill count={sideData.accountCount} />}
          <SyncErrorRollup count={sideData.failedCount} />
          <View style={{ flex: 1 }} />
          <SidebarBalance
            binding={totalBinding}
            testId={balanceTestId}
            style={{ fontSize: 12, fontWeight: 600, color: 'inherit' }}
          />
        </Link>
      </View>
      {isOpen &&
        sideData.buckets.map(bucket => (
          <SidebarAccountGroup
            key={bucket.group?.id ?? 'ungrouped'}
            bucket={bucket}
            side={side}
            showSyncDot={showSyncDot}
            isOpen={isBucketOpen(bucket)}
            onToggle={() => onToggleBucket(bucket)}
          />
        ))}
    </View>
  );
}
