import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgBookmark } from '@actual-app/components/icons/v1';
import { SpaceBetween } from '@actual-app/components/space-between';
import { theme } from '@actual-app/components/theme';

import { type PayeeEntity } from 'loot-core/types/models';

import { PayeeRuleCountLabel } from '@desktop-client/components/payees/PayeeRuleCountLabel';

type PayeesListItemProps = {
  payee: PayeeEntity;
  ruleCount: number;
  onPress: () => void;
};

export function PayeesListItem({
  payee,
  ruleCount,
  onPress,
}: PayeesListItemProps) {
  const { t } = useTranslation();

  return (
    <Button
      variant="bare"
      style={{
        minHeight: 56,
        width: '100%',
        borderRadius: 0,
        borderWidth: '0 0 1px 0',
        borderColor: theme.tableBorder,
        borderStyle: 'solid',
        backgroundColor: theme.tableBackground,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '12px 16px',
        gap: 5,
      }}
      onPress={onPress}
    >
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
            color: payee.transfer_acct ? theme.pageTextSubdued : theme.pageText,
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
    </Button>
  );
}
