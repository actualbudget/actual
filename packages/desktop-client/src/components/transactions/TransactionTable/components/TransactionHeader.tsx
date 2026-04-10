import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useHotkeys } from 'react-hotkeys-hook';

import { SvgArrowDown, SvgArrowUp } from '@actual-app/components/icons/v1';
import { SvgSubtract } from '@actual-app/components/icons/v2';
import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import { Row, Field, SelectCell, CustomCell, UnexposedCellContent } from '@desktop-client/components/table';
import { useSelectedDispatch } from '@desktop-client/hooks/useSelected';
import type { CSSProperties } from '@actual-app/components/styles';

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
};

type HeaderCellProps = {
  value: string;
  id: string;
  icon?: 'asc' | 'desc' | 'clickable';
  onClick?: () => void;
  width?: CSSProperties['width'];
  alignItems?: CSSProperties['alignItems'];
  marginLeft?: CSSProperties['marginLeft'];
  marginRight?: CSSProperties['marginRight'];
};

function HeaderCell({
  value,
  id,
  width,
  alignItems,
  marginLeft,
  marginRight,
  icon,
  onClick,
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
      alignItems={alignItems}
      value={value}
      style={{
        borderTopWidth: 0,
        borderBottomWidth: 0,
      }}
      unexposedContent={({ value: cellValue }) =>
        onClick ? (
          <Button variant="bare" onPress={onClick} style={style}>
            <UnexposedCellContent value={cellValue} />
            {icon === 'asc' && (
              <SvgArrowDown width={10} height={10} style={{ marginLeft: 5 }} />
            )}
            {icon === 'desc' && (
              <SvgArrowUp width={10} height={10} style={{ marginLeft: 5 }} />
            )}
          </Button>
        ) : (
          <Text style={style}>{cellValue}</Text>
        )
      }
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
  }: TransactionHeaderProps) => {
    const dispatchSelected = useSelectedDispatch();
    const { t } = useTranslation();

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
        {showSelection && (
          <SelectCell
            exposed
            focused={false}
            selected={hasSelected}
            width={20}
            style={{
              borderTopWidth: 0,
              borderBottomWidth: 0,
            }}
            icon={<SvgSubtract width={6} height={6} />}
            onSelect={(e: React.KeyboardEvent<HTMLDivElement>) =>
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
              width: '20px',
              border: 0,
            }}
          />
        )}
        <HeaderCell
          value={t('Date')}
          width={110}
          alignItems="flex"
          marginLeft={-5}
          id="date"
          icon={field === 'date' ? ascDesc : 'clickable'}
          onClick={() =>
            onSort('date', selectAscDesc(field, ascDesc, 'date', 'desc'))
          }
        />
        {showAccount && (
          <HeaderCell
            value={t('Account')}
            width="flex"
            alignItems="flex"
            marginLeft={-5}
            id="account"
            icon={field === 'account' ? ascDesc : 'clickable'}
            onClick={() =>
              onSort('account', selectAscDesc(field, ascDesc, 'account', 'asc'))
            }
          />
        )}
        <HeaderCell
          value={t('Payee')}
          width="flex"
          alignItems="flex"
          marginLeft={-5}
          id="payee"
          icon={field === 'payee' ? ascDesc : 'clickable'}
          onClick={() =>
            onSort('payee', selectAscDesc(field, ascDesc, 'payee', 'asc'))
          }
        />
        <HeaderCell
          value={t('Notes')}
          width="flex"
          alignItems="flex"
          marginLeft={-5}
          id="notes"
          icon={field === 'notes' ? ascDesc : 'clickable'}
          onClick={() =>
            onSort('notes', selectAscDesc(field, ascDesc, 'notes', 'asc'))
          }
        />
        {showCategory && (
          <HeaderCell
            value={t('Category')}
            width="flex"
            alignItems="flex"
            marginLeft={-5}
            id="category"
            icon={field === 'category' ? ascDesc : 'clickable'}
            onClick={() =>
              onSort(
                'category',
                selectAscDesc(field, ascDesc, 'category', 'asc'),
              )
            }
          />
        )}
        <HeaderCell
          value={t('Payment')}
          width={100}
          alignItems="flex-end"
          marginRight={-5}
          id="payment"
          icon={field === 'payment' ? ascDesc : 'clickable'}
          onClick={() =>
            onSort('payment', selectAscDesc(field, ascDesc, 'payment', 'asc'))
          }
        />
        <HeaderCell
          value={t('Deposit')}
          width={100}
          alignItems="flex-end"
          marginRight={-5}
          id="deposit"
          icon={field === 'deposit' ? ascDesc : 'clickable'}
          onClick={() =>
            onSort('deposit', selectAscDesc(field, ascDesc, 'deposit', 'desc'))
          }
        />
        {showBalance && (
          <HeaderCell
            value={t('Balance')}
            width={103}
            alignItems="flex-end"
            marginRight={-5}
            id="balance"
          />
        )}
        {showCleared && (
          <HeaderCell
            value="✓"
            width={38}
            alignItems="center"
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
