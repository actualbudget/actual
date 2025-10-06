import React, { memo } from 'react';
import { GridListItem, type GridListItemProps } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { SvgBookmark } from '@actual-app/components/icons/v1';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';

import { type PayeeEntity } from 'loot-core/types/models';

import { PayeeRuleCountLabel } from '@desktop-client/components/payees/PayeeRuleCountLabel';

type PayeesListItemProps = {
  value: PayeeEntity;
  ruleCount: number;
  isRuleCountLoading?: boolean;
} & Omit<GridListItemProps<PayeeEntity>, 'value'>;

export const PayeesListItem = memo(function PayeeListItem({
  value: payee,
  ruleCount,
  isRuleCountLoading,
  ...props
}: PayeesListItemProps) {
  const { t } = useTranslation();

  const label = payee.transfer_acct
    ? t('Transfer: {{name}}', { name: payee.name })
    : payee.name;

  return (
    <GridListItem
      id={payee.id}
      value={payee}
      textValue={label}
      style={styles.mobileListItem}
      {...props}
    >
      <SpaceBetween gap={5}>
        {payee.favorite && (
          <SvgBookmark
            aria-hidden
            focusable={false}
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
            title={label}
          >
            {label}
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
            <PayeeRuleCountLabel
              count={ruleCount}
              isLoading={isRuleCountLoading}
              style={{ fontSize: 12 }}
            />
          </span>
        </SpaceBetween>
      </SpaceBetween>
    </GridListItem>
  );
});
