import { createElement } from 'react';

import { theme } from '@actual-app/components/theme';
import type { TransactionEntity } from '@actual-app/core/types/models';

import { getStatusProps } from '#components/schedules/StatusBadge';
import type { StatusTypes } from '#components/schedules/StatusBadge';
import { Cell, CellButton } from '#components/table';

type StatusCellProps = {
  id: TransactionEntity['id'];
  status?: StatusTypes | null;
  focused?: boolean;
  selected?: boolean;
  isChild?: boolean;
  isPreview?: boolean;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onUpdate: (field: string, value: boolean) => void;
};

export function StatusCell({
  id,
  focused,
  selected,
  status,
  isChild,
  isPreview,
  onEdit,
  onUpdate,
}: StatusCellProps) {
  const isClearedField =
    status === 'cleared' || status === 'reconciled' || status == null;
  const statusProps = getStatusProps(status);

  const statusColor =
    status === 'cleared'
      ? theme.noticeTextLight
      : status === 'reconciled'
        ? theme.noticeTextLight
        : status === 'missed'
          ? theme.errorText
          : status === 'due'
            ? theme.warningText
            : selected
              ? theme.pageTextLinkLight
              : theme.pageTextSubdued;

  function onSelect() {
    if (isClearedField) {
      onUpdate('cleared', !(status === 'cleared'));
    }
  }

  return (
    <Cell
      name="cleared"
      width={38}
      alignItems="center"
      focused={focused}
      style={{ padding: 1 }}
      plain
    >
      <CellButton
        style={{
          padding: 3,
          backgroundColor: 'transparent',
          border: '1px solid transparent',
          borderRadius: 50,
          ':focus': {
            ...(isPreview
              ? {
                  boxShadow: 'none',
                }
              : {
                  border: '1px solid ' + theme.formInputBorderSelected,
                  boxShadow: '0 1px 2px ' + theme.formInputBorderSelected,
                }),
          },
          cursor: isClearedField ? 'pointer' : 'default',
          ...(isChild && { visibility: 'hidden' }),
        }}
        disabled={isPreview || isChild}
        onEdit={() => onEdit(id, 'cleared')}
        onSelect={onSelect}
      >
        {createElement(statusProps.Icon, {
          style: {
            width: 13,
            height: 13,
            color: statusColor,
            marginTop: status === 'due' ? -1 : 0,
          },
        })}
      </CellButton>
    </Cell>
  );
}
