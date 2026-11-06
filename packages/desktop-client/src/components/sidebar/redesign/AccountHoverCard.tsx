import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgArrowButtonDown1,
  SvgArrowButtonUp1,
} from '@actual-app/components/icons/v2';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import { BalanceHistoryGraph } from '#components/accounts/BalanceHistoryGraph';
import { Notes } from '#components/Notes';
import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { useNotes } from '#hooks/useNotes';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { isTouchDevice } from '#util/isTouchDevice';

type AccountHoverCardProps = {
  account: AccountEntity;
  isDisabled: boolean;
  children: ReactElement;
};

export function AccountHoverCard({
  account,
  isDisabled,
  children,
}: AccountHoverCardProps) {
  const { t } = useTranslation();
  const isTestEnv = useIsTestEnv();
  const [showBalanceHistory, setShowBalanceHistory] = useSyncedPref(
    `side-nav.show-balance-history-${account.id}`,
  );
  const accountNote = useNotes(`account-${account.id}`);

  if (isTouchDevice() || isTestEnv) {
    return children;
  }

  return (
    <Tooltip
      content={
        <View style={{ padding: spacing.md }}>
          <SpaceBetween
            gap={spacing.xs}
            style={{
              justifyContent: 'space-between',
              '& .hover-visible': {
                opacity: 0,
                transition: 'opacity .25s',
              },
              '&:hover .hover-visible': {
                opacity: 1,
              },
            }}
          >
            <Text style={{ fontWeight: 'bold' }}>{account.name}</Text>
            <Button
              aria-label={t('Toggle balance history')}
              variant="bare"
              onClick={() =>
                setShowBalanceHistory(
                  showBalanceHistory === 'true' ? 'false' : 'true',
                )
              }
              className="hover-visible"
            >
              <SpaceBetween gap={spacing.xxs}>
                {showBalanceHistory === 'true' ? (
                  <SvgArrowButtonUp1 width={10} height={10} />
                ) : (
                  <SvgArrowButtonDown1 width={10} height={10} />
                )}
              </SpaceBetween>
            </Button>
          </SpaceBetween>
          {showBalanceHistory === 'true' && (
            <BalanceHistoryGraph
              accountId={account.id}
              style={{ minWidth: 350, minHeight: 70 }}
            />
          )}
          {accountNote && (
            <Notes
              getStyle={() => ({
                borderTop: `1px solid ${theme.tooltipBorder}`,
                padding: 0,
                paddingTop: spacing.sm,
                marginTop: spacing.sm,
              })}
              notes={accountNote}
            />
          )}
        </View>
      }
      style={{ ...styles.tooltip, borderRadius: '0px 5px 5px 0px' }}
      placement="right top"
      triggerProps={{
        delay: 1000,
        closeDelay: 250,
        isDisabled,
      }}
    >
      {children}
    </Tooltip>
  );
}
