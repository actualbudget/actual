import { useRef } from 'react';
import { useButton, useDrop } from 'react-aria';
import { isTextDropItem } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { useMoveAccountMutation } from '#accounts';
import { Link } from '#components/common/Link';
import type { Binding } from '#spreadsheet';

import { AccountTree } from './AccountTree';
import { CollapseChevron } from './CollapseChevron';
import { CountPill } from './CountPill';
import { SidebarBalance } from './SidebarBalance';
import { sectionLabelStyle } from './styles';
import { SyncErrorRollup } from './SyncErrorRollup';
import { accountDragType } from './useAccountTreeDragAndDrop';
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
  isDragDisabled: boolean;
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
  isDragDisabled,
  isBucketOpen,
  onToggleBucket,
}: SideGroupProps) {
  const { t } = useTranslation();
  const moveAccount = useMoveAccountMutation();
  const dropButtonRef = useRef<HTMLButtonElement>(null);
  const oppositeAccountType = accountDragType(side === 'on' ? 'off' : 'on');
  const { dropProps, dropButtonProps, isDropTarget } = useDrop({
    ref: dropButtonRef,
    hasDropButton: true,
    isDisabled: isDragDisabled,
    getDropOperation: types =>
      types.has(oppositeAccountType) ? 'move' : 'cancel',
    async onDrop({ items }) {
      const [item] = items;
      if (item && isTextDropItem(item) && item.types.has(oppositeAccountType)) {
        const id = await item.getText(oppositeAccountType);
        moveAccount.mutate({ id, targetId: null, offBudget: side === 'off' });
      }
    },
  });
  const { buttonProps } = useButton(
    {
      ...dropButtonProps,
      'aria-label': t('Drop account in {{section}}', { section: label }),
      excludeFromTabOrder: true,
    },
    dropButtonRef,
  );

  return (
    <View style={{ marginTop: spacing.xxs }}>
      <View
        {...dropProps}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingBlock: spacing.xs,
          paddingLeft: spacing.xs,
          paddingRight: spacing.sm,
          ...(isDropTarget && {
            backgroundColor: theme.sidebarItemBackgroundHover,
            outline: `2px solid ${theme.pageTextLink}`,
            borderRadius: radius.sm,
          }),
        }}
      >
        {!isDragDisabled && (
          <button
            {...buttonProps}
            ref={dropButtonRef}
            style={styles.visuallyHidden}
          />
        )}
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
      {isOpen && sideData.buckets.length > 0 && (
        <AccountTree
          label={label}
          side={side}
          buckets={sideData.buckets}
          showSyncDot={showSyncDot}
          isDragDisabled={isDragDisabled}
          isBucketOpen={isBucketOpen}
          onToggleBucket={onToggleBucket}
        />
      )}
    </View>
  );
}
