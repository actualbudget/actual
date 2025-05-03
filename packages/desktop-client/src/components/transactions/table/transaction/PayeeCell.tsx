import React, { type CSSProperties, useRef } from 'react';

import { Button } from '@actual-app/components/button';
import {
  SvgLeftArrow2,
  SvgRightArrow2,
  SvgSplit,
} from '@actual-app/components/icons/v0';
import {
  SvgArrowsSynchronize,
  SvgCalendar3,
} from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import { useCachedSchedules } from 'loot-core/client/data-hooks/schedules';
import { pushModal } from 'loot-core/client/modals/modalsSlice';
import { isTemporaryId } from 'loot-core/shared/transactions';
import {
  type AccountEntity,
  type PayeeEntity,
  type ScheduleEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import { useDisplayPayee } from '../../../../hooks/useDisplayPayee';
import { useDispatch } from '../../../../redux';
import { PayeeAutocomplete } from '../../../autocomplete/PayeeAutocomplete';
import {
  Cell,
  CustomCell,
  CellButton,
  UnexposedCellContent,
} from '../../../table';
import {
  TransactionUpdateFunction,
  type SerializedTransaction,
  type TransactionEditFunction,
} from '../utils';

type PayeeCellProps = {
  id: TransactionEntity['id'];
  payee?: PayeeEntity;
  focused: boolean;
  payees: PayeeEntity[];
  accounts: AccountEntity[];
  transferAccountsByTransaction: {
    [id: TransactionEntity['id']]: AccountEntity;
  };
  valueStyle: CSSProperties | null;
  transaction: SerializedTransaction;
  importedPayee?: PayeeEntity['id'];
  isPreview: boolean;
  onEdit: TransactionEditFunction;
  onUpdate: TransactionUpdateFunction;
  onCreatePayee: (name: string) => Promise<PayeeEntity['id']>;
  onManagePayees: (id: PayeeEntity['id'] | undefined) => void;
  onNavigateToTransferAccount: (id: AccountEntity['id']) => void;
  onNavigateToSchedule: (id: ScheduleEntity['id']) => void;
};

export function PayeeCell({
  id,
  payee,
  focused,
  payees,
  accounts,
  transferAccountsByTransaction,
  valueStyle,
  transaction,
  importedPayee,
  isPreview,
  onEdit,
  onUpdate,
  onCreatePayee,
  onManagePayees,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
}: PayeeCellProps) {
  const isCreatingPayee = useRef(false);

  const dispatch = useDispatch();

  const transferAccount = transferAccountsByTransaction[transaction.id];

  const displayPayee = useDisplayPayee({ transaction });

  return transaction.is_parent ? (
    <Cell
      name="payee"
      width="flex"
      focused={focused}
      style={{ padding: 0 }}
      plain
    >
      <CellButton
        bare
        style={{
          alignSelf: 'flex-start',
          borderRadius: 4,
          border: '1px solid transparent', // so it doesn't shift on hover
          ':hover': isPreview
            ? {}
            : {
                border: '1px solid ' + theme.buttonNormalBorder,
              },
        }}
        disabled={isPreview}
        onSelect={() =>
          dispatch(
            pushModal({
              modal: {
                name: 'payee-autocomplete',
                options: {
                  onSelect: payeeId => {
                    onUpdate('payee', payeeId);
                  },
                },
              },
            }),
          )
        }
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'stretch',
            borderRadius: 4,
            flex: 1,
            padding: 4,
            color: theme.pageTextSubdued,
          }}
        >
          <PayeeIcons
            transaction={transaction}
            transferAccount={transferAccount}
            onNavigateToTransferAccount={onNavigateToTransferAccount}
            onNavigateToSchedule={onNavigateToSchedule}
          />
          <SvgSplit
            style={{
              color: 'inherit',
              width: 14,
              height: 14,
              marginRight: 5,
            }}
          />
          <Text
            style={{
              fontStyle: 'italic',
              fontWeight: 300,
              userSelect: 'none',
              borderBottom: importedPayee
                ? `1px dashed ${theme.pageTextSubdued}`
                : 'none',
            }}
          >
            {importedPayee ? (
              <Tooltip
                content={
                  <View style={{ padding: 10 }}>
                    <Text style={{ fontWeight: 'bold' }}>Imported Payee</Text>
                    <Text style={{ fontWeight: 'normal' }}>
                      {importedPayee}
                    </Text>
                  </View>
                }
                style={{ ...styles.tooltip, borderRadius: '0px 5px 5px 0px' }}
                placement="bottom"
                triggerProps={{ delay: 750 }}
              >
                {displayPayee}
              </Tooltip>
            ) : (
              displayPayee
            )}
          </Text>
        </View>
      </CellButton>
    </Cell>
  ) : (
    <CustomCell
      width="flex"
      name="payee"
      textAlign="flex"
      value={payee?.id}
      valueStyle={valueStyle}
      exposed={focused}
      onExpose={name => !isPreview && onEdit(id, name)}
      onUpdate={async value => {
        onUpdate('payee', value);

        if (value && value.startsWith('new:') && !isCreatingPayee.current) {
          isCreatingPayee.current = true;
          const id = await onCreatePayee(value.slice('new:'.length));
          onUpdate('payee', id);
          isCreatingPayee.current = false;
        }
      }}
      formatter={() => {
        if (!displayPayee && isPreview) {
          return '(No payee)';
        }
        return displayPayee;
      }}
      unexposedContent={props => {
        const payeeName = (
          <UnexposedCellContent
            {...props}
            style={
              importedPayee
                ? { borderBottom: `1px dashed ${theme.pageTextSubdued}` }
                : {}
            }
          />
        );

        return (
          <>
            <PayeeIcons
              transaction={transaction}
              transferAccount={transferAccount}
              onNavigateToTransferAccount={onNavigateToTransferAccount}
              onNavigateToSchedule={onNavigateToSchedule}
            />
            <div
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {importedPayee ? (
                <Tooltip
                  content={
                    <View style={{ padding: 10 }}>
                      <Text style={{ fontWeight: 'bold' }}>Imported Payee</Text>
                      <Text style={{ fontWeight: 'normal' }}>
                        {importedPayee}
                      </Text>
                    </View>
                  }
                  style={{ ...styles.tooltip, borderRadius: '0px 5px 5px 0px' }}
                  placement="bottom"
                  triggerProps={{ delay: 750 }}
                >
                  {payeeName}
                </Tooltip>
              ) : (
                payeeName
              )}
            </div>
          </>
        );
      }}
    >
      {({
        onBlur,
        onKeyDown,
        onUpdate,
        onSave,
        shouldSaveFromKey,
        inputStyle,
      }) => (
        <PayeeAutocomplete
          payees={payees}
          accounts={accounts}
          value={payee?.id ?? null}
          shouldSaveFromKey={shouldSaveFromKey}
          inputProps={{
            onBlur,
            onKeyDown,
            style: inputStyle,
          }}
          showManagePayees={true}
          clearOnBlur={false}
          focused={true}
          onUpdate={(_, value) => onUpdate?.(value)}
          onSelect={onSave}
          onManagePayees={() => onManagePayees(payee?.id)}
        />
      )}
    </CustomCell>
  );
}

const payeeIconButtonStyle = {
  marginLeft: -5,
  marginRight: 2,
  width: 23,
  height: 23,
  color: 'inherit',
};
const scheduleIconStyle = { width: 13, height: 13 };
const transferIconStyle = { width: 10, height: 10 };

type PayeeIconsProps = {
  transaction: SerializedTransaction;
  transferAccount: AccountEntity | null;
  onNavigateToTransferAccount: (id: AccountEntity['id']) => void;
  onNavigateToSchedule: (id: ScheduleEntity['id']) => void;
};

function PayeeIcons({
  transaction,
  transferAccount,
  onNavigateToTransferAccount,
  onNavigateToSchedule,
}: PayeeIconsProps) {
  const scheduleId = transaction.schedule;
  const { isLoading, schedules = [] } = useCachedSchedules();

  if (isLoading) {
    return null;
  }

  const schedule = scheduleId ? schedules.find(s => s.id === scheduleId) : null;

  if (schedule === null && transferAccount === null) {
    // Neither a valid scheduled transaction nor a transfer.
    return null;
  }

  const recurring = schedule && schedule._date && !!schedule._date.frequency;
  const isDeposit = transaction.amount > 0;

  return (
    <>
      {schedule && (
        <Button
          variant="bare"
          data-testid="schedule-icon"
          aria-label="See schedule details"
          style={payeeIconButtonStyle}
          onPress={() => {
            if (scheduleId) {
              onNavigateToSchedule(scheduleId);
            }
          }}
        >
          {recurring ? (
            <SvgArrowsSynchronize style={scheduleIconStyle} />
          ) : (
            <SvgCalendar3 style={scheduleIconStyle} />
          )}
        </Button>
      )}
      {transferAccount && (
        <Button
          variant="bare"
          data-testid="transfer-icon"
          aria-label="See transfer account"
          style={payeeIconButtonStyle}
          onPress={() => {
            if (!isTemporaryId(transaction.id)) {
              onNavigateToTransferAccount(transferAccount.id);
            }
          }}
        >
          {isDeposit ? (
            <SvgLeftArrow2 style={transferIconStyle} />
          ) : (
            <SvgRightArrow2 style={transferIconStyle} />
          )}
        </Button>
      )}
    </>
  );
}
