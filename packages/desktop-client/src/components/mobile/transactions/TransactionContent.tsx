import React, { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import {
  SvgArrowsSynchronize,
  SvgCalendar3,
  SvgLeftArrow2,
  SvgRightArrow2,
} from '@actual-app/components/icons/v0';
import {
  SvgCheckCircle1,
  SvgLockClosed,
  SvgSplit,
} from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { isPreviewId } from 'loot-core/shared/transactions';
import { integerToCurrency } from 'loot-core/shared/util';
import {
  type AccountEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { lookupName, Status } from './TransactionEdit';

import { makeAmountFullStyle } from '@desktop-client/components/budget/util';
import { useCachedSchedules } from '@desktop-client/hooks/useCachedSchedules';
import { NotesTagFormatter } from '@desktop-client/notes/NotesTagFormatter';

type PayeeIconsProps = {
  transaction: TransactionEntity;
  transferAccount?: AccountEntity;
};

function PayeeIcons({ transaction, transferAccount }: PayeeIconsProps) {
  const { id, schedule: scheduleId } = transaction;
  const { isLoading: isSchedulesLoading, schedules = [] } =
    useCachedSchedules();

  const isPreview = isPreviewId(id);
  const schedule = schedules.find((s: any) => s.id === scheduleId);
  const isScheduleRecurring =
    schedule && schedule._date && !!schedule._date.frequency;

  const getScheduleIconStyle = ({ isPreview }: { isPreview: boolean }) => ({
    width: 12,
    height: 12,
    marginRight: 5,
    color: isPreview ? theme.pageTextLight : theme.menuItemText,
  });

  if (isSchedulesLoading) {
    return null;
  }

  return (
    <>
      {schedule &&
        (isScheduleRecurring ? (
          <SvgArrowsSynchronize style={getScheduleIconStyle({ isPreview })} />
        ) : (
          <SvgCalendar3 style={getScheduleIconStyle({ isPreview })} />
        ))}
      {transferAccount &&
        (transaction.amount > 0 ? (
          <SvgLeftArrow2 style={{ width: 12, height: 12, marginRight: 5 }} />
        ) : (
          <SvgRightArrow2 style={{ width: 12, height: 12, marginRight: 5 }} />
        ))}
    </>
  );
}

type TransactionContentProps = {
  transaction: TransactionEntity;
  transferAccount?: AccountEntity;
  textStyle: CSSProperties;
  isAdded: boolean;
  displayPayee: string | null;
  isPreview: boolean;
  previewStatus: string | null;
  isParent: boolean;
  isChild: boolean;
  isReconciled: boolean;
  isCleared: boolean;
  prettyCategory: string | null;
  specialCategory: string | null;
  notes: string | null;
  amount: number;
};

export function TransactionContent({
  transaction,
  transferAccount,
  textStyle,
  isAdded,
  displayPayee,
  isPreview,
  previewStatus,
  isParent,
  isChild,
  isReconciled,
  isCleared,
  prettyCategory,
  specialCategory,
  notes,
  amount,
}: TransactionContentProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 4px',
      }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <PayeeIcons
            transaction={transaction}
            transferAccount={transferAccount}
          />
          <TextOneLine
            style={{
              ...textStyle,
              fontWeight: isAdded ? '600' : '400',
              ...(!displayPayee && !isPreview
                ? {
                    color: theme.pageTextLight,
                    fontStyle: 'italic',
                  }
                : {}),
            }}
          >
            {displayPayee || t('(No payee)')}
          </TextOneLine>
        </View>
        {isPreview ? (
          <Status status={previewStatus} isSplit={isParent || isChild} />
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
                  color: isCleared
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
              {prettyCategory || t('Uncategorized')}
            </TextOneLine>
          </View>
        )}
        {notes && (
          <TextOneLine
            style={{
              fontSize: 11,
              marginTop: 4,
              fontWeight: '400',
              color: theme.tableText,
              textAlign: 'left',
              opacity: 0.85,
            }}
          >
            <NotesTagFormatter notes={notes} />
          </TextOneLine>
        )}
      </View>
      <View style={{ justifyContent: 'center' }}>
        <Text
          style={{
            ...textStyle,
            ...makeAmountFullStyle(amount),
          }}
        >
          {integerToCurrency(amount)}
        </Text>
      </View>
    </View>
  );
}