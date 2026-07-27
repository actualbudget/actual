import React from 'react';
import { GridListItem } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgMenu } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Toggle } from '@actual-app/components/toggle';
import { css } from '@emotion/css';

import { isTransactionTableColumnLocked } from '#components/transactions/table/columns';
import type {
  TransactionTableColumn,
  TransactionTableColumnId,
} from '#components/transactions/table/columns';

type TransactionTableColumnListItemProps = {
  column: TransactionTableColumn;
  label: string;
  onToggle: (id: TransactionTableColumnId, isVisible: boolean) => void;
};

export function TransactionTableColumnListItem({
  column,
  label,
  onToggle,
}: TransactionTableColumnListItemProps) {
  const { t } = useTranslation();
  const isLocked = isTransactionTableColumnLocked(column.id);

  return (
    <GridListItem
      id={column.id}
      textValue={label}
      className={css({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        marginBottom: 4,
        borderRadius: 6,
        border: '1px solid ' + theme.tableBorder,
        backgroundColor: theme.tableBackground,
        outline: 'none',
        '&[data-hovered]': {
          backgroundColor: theme.tableRowBackgroundHover,
        },
        '&[data-dragging]': {
          opacity: 0.5,
        },
        '&[data-focus-visible]': {
          boxShadow: '0 0 0 2px ' + theme.formInputBorderSelected,
        },
      })}
    >
      <Button
        slot="drag"
        variant="bare"
        aria-label={t('Reorder {{ columnName }} column', {
          columnName: label,
        })}
        style={{
          cursor: 'grab',
          color: theme.pageTextSubdued,
          padding: 4,
        }}
      >
        <SvgMenu width={12} height={12} />
      </Button>
      <Text
        style={{
          flex: 1,
          color: column.hidden ? theme.pageTextSubdued : theme.tableText,
        }}
      >
        {label}
      </Text>
      {isLocked ? (
        <Text
          style={{
            color: theme.pageTextSubdued,
            fontStyle: 'italic',
            fontSize: 12,
          }}
        >
          <Trans>Always shown</Trans>
        </Text>
      ) : (
        <Toggle
          id={`toggle-column-${column.id}`}
          aria-label={label}
          isOn={!column.hidden}
          onToggle={isVisible => onToggle(column.id, isVisible)}
        />
      )}
    </GridListItem>
  );
}
