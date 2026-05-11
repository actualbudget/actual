import { memo, useRef, useState } from 'react';
import type {
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgArrowDown, SvgArrowUp } from '@actual-app/components/icons/v1';
import { SvgSubtract } from '@actual-app/components/icons/v2';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import {
  CustomCell,
  Field,
  Row,
  SelectCell,
  UnexposedCellContent,
} from '#components/table';
import {
  TRANSACTION_CLEARED_COLUMN_WIDTH,
  TRANSACTION_SELECTION_COLUMN_WIDTH,
} from '#components/transactions/TransactionTable/transactionTableColumns';
import type {
  TransactionColumnId,
  TransactionColumnWidths,
} from '#components/transactions/TransactionTable/types';
import { useContextMenu } from '#hooks/useContextMenu';
import { useSelectedDispatch } from '#hooks/useSelected';

type TransactionHeaderProps = {
  hasSelected: boolean;
  showAccount: boolean;
  showCategory: boolean;
  showBalance: boolean;
  showCleared: boolean;
  scrollWidth: number;
  showSelection: boolean;
  onSort: (field: string, ascDesc: 'asc' | 'desc') => void;
  ascDesc: 'asc' | 'desc';
  field: string;
  columnWidths: TransactionColumnWidths;
  getResizeHandleProps: (columnId: TransactionColumnId) => {
    isResizable: boolean;
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  };
  onResetAllColumnWidths: () => void;
  onResetColumnWidth: (columnId: TransactionColumnId) => void;
};

type HeaderCellProps = {
  value: string;
  id: TransactionColumnId | 'cleared';
  icon?: 'asc' | 'desc' | 'clickable';
  onClick?: () => void;
  width?: CSSProperties['width'];
  textAlign?: CSSProperties['textAlign'];
  alignItems?: CSSProperties['alignItems'];
  marginLeft?: CSSProperties['marginLeft'];
  marginRight?: CSSProperties['marginRight'];
  isResizable?: boolean;
  onResizePointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void;
};

function HeaderCell({
  value,
  id,
  width,
  textAlign,
  alignItems,
  marginLeft,
  marginRight,
  icon,
  onClick,
  isResizable,
  onResizePointerDown,
  onContextMenu,
}: HeaderCellProps) {
  const style = {
    whiteSpace: 'nowrap' as CSSProperties['whiteSpace'],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: theme.tableHeaderText,
    fontWeight: 300,
    marginLeft,
    marginRight,
  };

  return (
    <CustomCell
      width={width}
      name={id}
      textAlign={textAlign}
      alignItems={alignItems}
      value={value}
      style={{
        borderTopWidth: 0,
        borderBottomWidth: 0,
        paddingRight: isResizable ? 12 : undefined,
      }}
      unexposedContent={({ value: cellValue }) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: textAlign === 'right' ? 'flex-end' : 'flex-start',
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
          onContextMenu={onContextMenu}
        >
          {onClick ? (
            <Button
              variant="bare"
              onPress={onClick}
              style={{
                ...style,
                flex: 1,
                minWidth: 0,
                justifyContent:
                  textAlign === 'right' ? 'flex-end' : 'flex-start',
                textAlign: textAlign || 'left',
              }}
            >
              <UnexposedCellContent value={cellValue} />
              {icon === 'asc' && (
                <SvgArrowDown
                  width={10}
                  height={10}
                  style={{ marginLeft: 5 }}
                />
              )}
              {icon === 'desc' && (
                <SvgArrowUp width={10} height={10} style={{ marginLeft: 5 }} />
              )}
            </Button>
          ) : (
            <Text style={{ ...style, flex: 1, minWidth: 0 }}>{cellValue}</Text>
          )}
          {isResizable && onResizePointerDown && (
            <div
              role="separator"
              aria-orientation="vertical"
              data-testid={`transaction-header-resize-${id}`}
              onPointerDown={onResizePointerDown}
              style={{
                position: 'absolute',
                top: 0,
                right: -6,
                width: 14,
                height: '100%',
                cursor: 'col-resize',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 2,
                  height: '55%',
                  borderRadius: 999,
                  backgroundColor: theme.tableBorder,
                  opacity: 0.9,
                }}
              />
            </div>
          )}
        </div>
      )}
    />
  );
}

function selectAscDesc(
  field: string,
  ascDesc: 'asc' | 'desc',
  clicked: string,
  defaultAscDesc: 'asc' | 'desc' = 'asc',
): 'asc' | 'desc' {
  return field === clicked
    ? ascDesc === 'asc'
      ? 'desc'
      : 'asc'
    : defaultAscDesc;
}

export const TransactionHeader = memo(
  ({
    hasSelected,
    showAccount,
    showCategory,
    showBalance,
    showCleared,
    scrollWidth,
    onSort,
    ascDesc,
    field,
    showSelection,
    columnWidths,
    getResizeHandleProps,
    onResetAllColumnWidths,
    onResetColumnWidth,
  }: TransactionHeaderProps) => {
    const dispatchSelected = useSelectedDispatch();
    const { t } = useTranslation();
    const triggerRef = useRef<HTMLDivElement>(null);
    const { menuOpen, setMenuOpen, handleContextMenu, position } =
      useContextMenu();
    const [contextColumnId, setContextColumnId] =
      useState<TransactionColumnId | null>(null);
    const columnLabelById: Record<TransactionColumnId, string> = {
      date: t('Date'),
      account: t('Account'),
      payee: t('Payee'),
      notes: t('Notes'),
      category: t('Category'),
      payment: t('Payment'),
      deposit: t('Deposit'),
      balance: t('Balance'),
    };
    const renderResizableHeaderCell = ({
      columnId,
      value,
      textAlign,
      alignItems,
      marginLeft,
      marginRight,
      icon,
      onClick,
    }: {
      columnId: TransactionColumnId;
      value: string;
      textAlign?: CSSProperties['textAlign'];
      alignItems?: CSSProperties['alignItems'];
      marginLeft?: CSSProperties['marginLeft'];
      marginRight?: CSSProperties['marginRight'];
      icon?: 'asc' | 'desc' | 'clickable';
      onClick?: () => void;
    }) => {
      const resizeHandle = getResizeHandleProps(columnId);
      const handleColumnContextMenu = (
        event: ReactMouseEvent<HTMLDivElement>,
      ) => {
        setContextColumnId(columnId);
        handleContextMenu(event);
      };

      return (
        <HeaderCell
          value={value}
          width={columnWidths[columnId]}
          textAlign={textAlign}
          alignItems={alignItems}
          marginLeft={marginLeft}
          marginRight={marginRight}
          id={columnId}
          icon={icon}
          isResizable={resizeHandle.isResizable}
          onResizePointerDown={resizeHandle.onPointerDown}
          onClick={onClick}
          onContextMenu={handleColumnContextMenu}
        />
      );
    };

    useHotkeys(
      'ctrl+a, cmd+a, meta+a',
      () => dispatchSelected({ type: 'select-all' }),
      {
        preventDefault: true,
        scopes: ['app'],
      },
      [dispatchSelected],
    );

    return (
      <Row
        ref={triggerRef}
        style={{
          fontWeight: 300,
          zIndex: 200,
          color: theme.tableHeaderText,
          backgroundColor: theme.tableHeaderBackground,
          paddingRight: `${5 + (scrollWidth ?? 0)}px`,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: theme.tableBorder,
        }}
      >
        <Popover
          triggerRef={triggerRef}
          placement="bottom start"
          isOpen={menuOpen}
          onOpenChange={() => setMenuOpen(false)}
          {...position}
          style={{ width: 220, margin: 1 }}
          isNonModal
        >
          <Menu
            items={
              [
                ...(contextColumnId
                  ? [
                      {
                        name: 'reset-column' as const,
                        text: t('Reset {{columnName}} size', {
                          columnName: columnLabelById[contextColumnId],
                        }),
                      },
                    ]
                  : []),
                {
                  name: 'reset-all' as const,
                  text: t('Reset all'),
                },
              ] as const
            }
            onMenuSelect={name => {
              if (name === 'reset-column' && contextColumnId) {
                onResetColumnWidth(contextColumnId);
              } else if (name === 'reset-all') {
                onResetAllColumnWidths();
              }

              setMenuOpen(false);
            }}
          />
        </Popover>
        {showSelection && (
          <SelectCell
            exposed
            focused={false}
            selected={hasSelected}
            width={TRANSACTION_SELECTION_COLUMN_WIDTH}
            style={{
              borderTopWidth: 0,
              borderBottomWidth: 0,
            }}
            icon={<SvgSubtract width={6} height={6} />}
            onSelect={(e: KeyboardEvent<HTMLDivElement>) =>
              dispatchSelected({
                type: 'select-all',
                isRangeSelect: e.shiftKey,
              })
            }
          />
        )}
        {!showSelection && (
          <Field
            style={{
              width: `${TRANSACTION_SELECTION_COLUMN_WIDTH}px`,
              border: 0,
            }}
          />
        )}
        {renderResizableHeaderCell({
          columnId: 'date',
          value: t('Date'),
          textAlign: 'left',
          marginLeft: -5,
          icon: field === 'date' ? ascDesc : 'clickable',
          onClick: () =>
            onSort('date', selectAscDesc(field, ascDesc, 'date', 'desc')),
        })}
        {showAccount &&
          renderResizableHeaderCell({
            columnId: 'account',
            value: t('Account'),
            textAlign: 'left',
            marginLeft: -5,
            icon: field === 'account' ? ascDesc : 'clickable',
            onClick: () =>
              onSort(
                'account',
                selectAscDesc(field, ascDesc, 'account', 'asc'),
              ),
          })}
        {renderResizableHeaderCell({
          columnId: 'payee',
          value: t('Payee'),
          textAlign: 'left',
          marginLeft: -5,
          icon: field === 'payee' ? ascDesc : 'clickable',
          onClick: () =>
            onSort('payee', selectAscDesc(field, ascDesc, 'payee', 'asc')),
        })}
        {renderResizableHeaderCell({
          columnId: 'notes',
          value: t('Notes'),
          textAlign: 'left',
          marginLeft: -5,
          icon: field === 'notes' ? ascDesc : 'clickable',
          onClick: () =>
            onSort('notes', selectAscDesc(field, ascDesc, 'notes', 'asc')),
        })}
        {showCategory &&
          renderResizableHeaderCell({
            columnId: 'category',
            value: t('Category'),
            textAlign: 'left',
            marginLeft: -5,
            icon: field === 'category' ? ascDesc : 'clickable',
            onClick: () =>
              onSort(
                'category',
                selectAscDesc(field, ascDesc, 'category', 'asc'),
              ),
          })}
        {renderResizableHeaderCell({
          columnId: 'payment',
          value: t('Payment'),
          textAlign: 'right',
          marginRight: -5,
          icon: field === 'payment' ? ascDesc : 'clickable',
          onClick: () =>
            onSort('payment', selectAscDesc(field, ascDesc, 'payment', 'asc')),
        })}
        {renderResizableHeaderCell({
          columnId: 'deposit',
          value: t('Deposit'),
          textAlign: 'right',
          marginRight: -5,
          icon: field === 'deposit' ? ascDesc : 'clickable',
          onClick: () =>
            onSort('deposit', selectAscDesc(field, ascDesc, 'deposit', 'desc')),
        })}
        {showBalance &&
          renderResizableHeaderCell({
            columnId: 'balance',
            value: t('Balance'),
            textAlign: 'right',
            marginRight: -5,
          })}
        {showCleared && (
          <HeaderCell
            value="✓"
            width={TRANSACTION_CLEARED_COLUMN_WIDTH}
            textAlign="left"
            id="cleared"
            icon={field === 'cleared' ? ascDesc : 'clickable'}
            onClick={() => {
              onSort(
                'cleared',
                selectAscDesc(field, ascDesc, 'cleared', 'asc'),
              );
            }}
          />
        )}
      </Row>
    );
  },
);

TransactionHeader.displayName = 'TransactionHeader';
