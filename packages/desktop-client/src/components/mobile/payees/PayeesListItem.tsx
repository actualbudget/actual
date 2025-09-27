import React, { type ComponentPropsWithoutRef } from 'react';
import { GridListItem } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { SvgBookmark } from '@actual-app/components/icons/v1';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';

import { type PayeeEntity } from 'loot-core/types/models';

import { PayeeRuleCountLabel } from '@desktop-client/components/payees/PayeeRuleCountLabel';

type PayeesListItemProps = ComponentPropsWithoutRef<
  typeof GridListItem<PayeeEntity>
> & {
  value: PayeeEntity;
  ruleCount: number;
};

export function PayeesListItem({
  value: payee,
  ruleCount,
  ...props
}: PayeesListItemProps) {
  const { t } = useTranslation();

  return (
    <GridListItem
      value={payee}
      textValue={payee.name}
      style={styles.mobileListItem}
      {...props}
    >
      <SpaceBetween gap={5}>
        {payee.favorite && (
          <SvgBookmark
            width={15}
            height={15}
            style={{
              color: theme.pageText,
              flexShrink: 0,
            }}
          />
        )}
        <SpaceBetween
          style={{
            justifyContent: 'space-between',
            flex: 1,
            alignItems: 'flex-start',
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: payee.transfer_acct
                ? theme.pageTextSubdued
                : theme.pageText,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              textAlign: 'left',
            }}
            title={payee.name}
          >
            {(payee.transfer_acct ? t('Transfer: ') : '') + payee.name}
          </span>

          <span
            style={{
              borderRadius: 4,
              padding: '3px 6px',
              backgroundColor: theme.noticeBackground,
              border: '1px solid ' + theme.noticeBackground,
              color: theme.noticeTextDark,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            <PayeeRuleCountLabel count={ruleCount} style={{ fontSize: 12 }} />
          </span>
        </SpaceBetween>
      </SpaceBetween>
    </GridListItem>
  );
}
