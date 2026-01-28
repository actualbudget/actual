import React from 'react';
import type { GridListItemProps } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgBookmark } from '@actual-app/components/icons/v1';
import { SpaceBetween } from '@actual-app/components/space-between';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { PayeeEntity } from 'loot-core/types/models';
import type { WithRequired } from 'loot-core/types/util';

import { ActionableGridListItem } from '@desktop-client/components/mobile/ActionableGridListItem';
import { PayeeRuleCountLabel } from '@desktop-client/components/payees/PayeeRuleCountLabel';

type PayeesListItemProps = {
  ruleCount: number;
  isRuleCountLoading?: boolean;
  onDelete: () => void;
  onViewRules: () => void;
} & WithRequired<GridListItemProps<PayeeEntity>, 'value'>;

export function PayeesListItem({
  value: payee,
  ruleCount,
  isRuleCountLoading,
  onDelete,
  onViewRules,
  ...props
}: PayeesListItemProps) {
  const { t } = useTranslation();

  const label = payee.transfer_acct
    ? t('Transfer: {{name}}', { name: payee.name })
    : payee.name;

  return (
    <ActionableGridListItem
      id={payee.id}
      value={payee}
      textValue={label}
      actionsWidth={200}
      actions={
        !payee.transfer_acct && (
          <View style={{ flexDirection: 'row', flex: 1 }}>
            <Button
              variant="bare"
              onPress={onViewRules}
              style={{
                color: theme.pillText,
                backgroundColor: theme.pillBackground,
                flex: 1,
                borderRadius: 0,
              }}
            >
              {ruleCount > 0 ? (
                <Trans>View rules</Trans>
              ) : (
                <Trans>Create rule</Trans>
              )}
            </Button>
            <Button
              variant="bare"
              onPress={onDelete}
              style={{
                color: theme.errorText,
                flex: 1,
                borderRadius: 0,
              }}
            >
              <Trans>Delete</Trans>
            </Button>
          </View>
        )
      }
      {...props}
    >
      <SpaceBetween gap={5} style={{ flex: 1 }}>
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
    </ActionableGridListItem>
  );
}
