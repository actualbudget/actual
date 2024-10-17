import React, { memo } from 'react';
import { mergeProps } from 'react-aria';

import {
  PressResponder,
  usePress,
  useLongPress,
} from '@react-aria/interactions';

import { getScheduledAmount } from 'loot-core/src/shared/schedules';
import { isPreviewId } from 'loot-core/src/shared/transactions';
import { integerToCurrency } from 'loot-core/src/shared/util';

import { useAccount } from '../../../hooks/useAccount';
import { useCategories } from '../../../hooks/useCategories';
import { usePayee } from '../../../hooks/usePayee';
import { SvgSplit } from '../../../icons/v0';
import {
  SvgArrowsSynchronize,
  SvgCheckCircle1,
  SvgLockClosed,
} from '../../../icons/v2';
import { styles, theme } from '../../../style';
import { makeAmountFullStyle } from '../../budget/util';
import { Button } from '../../common/Button2';
import { Text } from '../../common/Text';
import { TextOneLine } from '../../common/TextOneLine';
import { View } from '../../common/View';
import { usePrettyPayee } from '../usePrettyPayee';

import { lookupName, Status } from './TransactionEdit';

const ROW_HEIGHT = 50;

const ListItem = ({ children, style, ...props }) => {
  return (
    <View
      style={{
        height: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10,
        paddingRight: 10,
        ...style,
      }}
      {...props}
    >
      {children}
    </View>
  );
};

ListItem.displayName = 'ListItem';

export const Transaction = memo(function Transaction({
  transaction,
  isAdded,
  isSelected,
  onPress,
  onLongPress,
  style,
}) {
  const { list: categories } = useCategories();

  const {
    id,
    payee: payeeId,
    amount: originalAmount,
    category: categoryId,
    account: accountId,
    cleared,
    is_parent: isParent,
    is_child: isChild,
    schedule,
    _inverse,
  } = transaction;

  const payee = usePayee(payeeId);
  const account = useAccount(accountId);
  const transferAccount = useAccount(payee?.transfer_acct);
  const isPreview = isPreviewId(id);

  const { longPressProps } = useLongPress({
    accessibilityDescription: 'Long press to select multiple transactions',
    onLongPress: () => {
      if (isPreview) {
        return;
      }

      onLongPress(transaction);
    },
  });

  const { pressProps } = usePress({
    onPress: () => {
      onPress(transaction);
    },
  });

  let amount = originalAmount;
  if (isPreview) {
    amount = getScheduledAmount(amount, _inverse);
  }

  const categoryName = lookupName(categories, categoryId);

  const prettyPayee = usePrettyPayee({
    transaction,
    payee,
    transferAccount,
  });
  const specialCategory = account?.offbudget
    ? 'Off Budget'
    : transferAccount && !transferAccount.offbudget
      ? 'Transfer'
      : isParent
        ? 'Split'
        : null;

  const prettyCategory = specialCategory || categoryName;

  const isReconciled = transaction.reconciled;
  const textStyle = isPreview && {
    fontStyle: 'italic',
    color: theme.pageTextLight,
  };

  return (
    <PressResponder {...mergeProps(pressProps, longPressProps)}>
      <Button
        style={{
          backgroundColor: theme.tableBackground,
          ...(isSelected
            ? {
                borderWidth: '0 0 0 4px',
                borderColor: theme.mobileTransactionSelected,
                borderStyle: 'solid',
              }
            : {
                border: 'none',
              }),
          userSelect: 'none',
          width: '100%',
          height: 60,
          ...(isPreview
            ? {
                backgroundColor: theme.tableRowHeaderBackground,
              }
            : {}),
        }}
      >
        <ListItem
          style={{
            flex: 1,
            ...style,
          }}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {schedule && (
                <SvgArrowsSynchronize
                  style={{
                    width: 12,
                    height: 12,
                    marginRight: 5,
                    color: textStyle.color || theme.menuItemText,
                  }}
                />
              )}
              <TextOneLine
                style={{
                  ...styles.text,
                  ...textStyle,
                  fontSize: 14,
                  fontWeight: isAdded ? '600' : '400',
                  ...(prettyPayee === '' && {
                    color: theme.tableTextLight,
                    fontStyle: 'italic',
                  }),
                }}
              >
                {prettyPayee || 'Empty'}
              </TextOneLine>
            </View>
            {isPreview ? (
              <Status status={categoryId} isSplit={isParent || isChild} />
            ) : (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 3,
                }}
              >
                {isReconciled ? (
                  <SvgLockClosed
                    style={{
                      width: 11,
                      height: 11,
                      color: theme.noticeTextLight,
                      marginRight: 5,
                    }}
                  />
                ) : (
                  <SvgCheckCircle1
                    style={{
                      width: 11,
                      height: 11,
                      color: cleared
                        ? theme.noticeTextLight
                        : theme.pageTextSubdued,
                      marginRight: 5,
                    }}
                  />
                )}
                {(isParent || isChild) && (
                  <SvgSplit
                    style={{
                      width: 12,
                      height: 12,
                      marginRight: 5,
                    }}
                  />
                )}
                <TextOneLine
                  style={{
                    fontSize: 11,
                    marginTop: 1,
                    fontWeight: '400',
                    color: prettyCategory
                      ? theme.tableText
                      : theme.menuItemTextSelected,
                    fontStyle:
                      specialCategory || !prettyCategory ? 'italic' : undefined,
                    textAlign: 'left',
                  }}
                >
                  {prettyCategory || 'Uncategorized'}
                </TextOneLine>
              </View>
            )}
          </View>
          <Text
            style={{
              ...styles.text,
              ...textStyle,
              marginLeft: 25,
              marginRight: 5,
              fontSize: 14,
              ...makeAmountFullStyle(amount),
            }}
          >
            {integerToCurrency(amount)}
          </Text>
        </ListItem>
      </Button>
    </PressResponder>
  );
});
