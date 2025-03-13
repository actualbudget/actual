import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgArrowDown, SvgArrowUp } from '@actual-app/components/icons/v1';
import { type CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { v4 as uuidV4 } from 'uuid';

import { holdings } from 'loot-core/client/queries';
import { useQuery } from 'loot-core/client/query-hooks';
import { send } from 'loot-core/platform/client/fetch';
import { evalArithmetic } from 'loot-core/shared/arithmetic';
import {
  amountToInteger,
  currencyToInteger,
  integerToAmount,
} from 'loot-core/shared/util';
import { type AccountEntity } from 'loot-core/types/models';
import { type HoldingEntity } from 'loot-core/types/models/holding';

import {
  CustomCell,
  InputCell,
  Row,
  Table,
  UnexposedCellContent,
  useTableNavigator,
} from '../../table';

export type InvestmentAccountProps = {
  account: AccountEntity;
  isAddingHolding: boolean;
  onResetAddHolding: () => void;
};

export function InvestmentAccount({
  account,
  isAddingHolding,
  onResetAddHolding,
}: InvestmentAccountProps) {
  const [orderBy, onOrderBy] = useOrderBy();
  const holdingsQuery = useQuery<HoldingEntity>(
    () => holdings(account.id).select('*').orderBy(orderBy),
    [account, orderBy],
  );
  const holdingsData = (holdingsQuery.data || []) as HoldingEntity[];

  return (
    <InvestmentTable
      account={account}
      isAddingHolding={isAddingHolding}
      onResetAddHolding={onResetAddHolding}
      holdings={holdingsData}
      orderBy={orderBy}
      onOrderBy={onOrderBy}
    />
  );
}

function useOrderBy(): [
  { [key: string]: 'asc' | 'desc' },
  (field: keyof HoldingEntity) => void,
] {
  const [orderBy, setOrderBy] = useState<
    | {
        field: keyof HoldingEntity;
        direction: 'asc' | 'desc';
      }
    | undefined
  >(undefined);
  const orderByObj = {
    [orderBy?.field ?? 'symbol']: orderBy?.direction ?? 'asc',
  };

  function onOrderBy(field: keyof HoldingEntity) {
    if (orderByObj[field] === 'asc') {
      setOrderBy({ field, direction: 'desc' });
    } else if (orderByObj[field] === 'desc') {
      setOrderBy(undefined);
    } else {
      setOrderBy({ field, direction: 'asc' });
    }
  }
  return [orderByObj, onOrderBy];
}

type InvestmentTableField = {
  name: keyof HoldingEntity;
  icon: string;
  type: 'string' | 'decimal' | 'currency';
};

export type InvestmentTableProps = {
  account: AccountEntity;
  holdings: HoldingEntity[];
  orderBy: { [key: string]: 'asc' | 'desc' };
  onOrderBy: (field: keyof HoldingEntity) => void;
  isAddingHolding: boolean;
  onResetAddHolding: () => void;
};

export function InvestmentTable({
  account,
  holdings,
  orderBy,
  onOrderBy,
  isAddingHolding,
  onResetAddHolding,
}: InvestmentTableProps) {
  const fields: InvestmentTableField[] = [
    { name: 'symbol', icon: 'clickable', type: 'string' },
    { name: 'title', icon: 'clickable', type: 'string' },
    { name: 'shares', icon: 'number', type: 'decimal' },
    { name: 'market_value', icon: 'dollar', type: 'currency' },
    { name: 'purchase_price', icon: 'dollar', type: 'currency' },
  ];
  const tableNavigator = useTableNavigator(
    holdings,
    fields.map(f => f.name),
  );
  const [newHolding, setNewHolding] = useState<HoldingEntity | undefined>(
    undefined,
  );
  function clearNewHolding() {
    onResetAddHolding();
    setNewHolding(undefined);
  }
  useEffect(() => {
    if (isAddingHolding && newHolding === undefined) {
      setNewHolding({
        id: uuidV4(),
        account: account.id,
      } as HoldingEntity);
    }
  }, [isAddingHolding, account.id, newHolding]);

  function onUpdate(
    id: HoldingEntity['id'],
    field: InvestmentTableField,
    newValue: string,
  ) {
    const holding = holdings.find(h => h.id === id);
    if (!holding) {
      return;
    }
    send('holding-update', {
      ...holding,
      [field.name]: getUpdateValue(field, newValue),
    });
  }

  function onUpdateNew(
    _: HoldingEntity['id'],
    field: InvestmentTableField,
    newValue: string,
  ) {
    if (!newHolding) {
      return;
    }
    setNewHolding({
      ...newHolding,
      [field.name]: getUpdateValue(field, newValue),
    });
  }

  function getUpdateValue(
    field: InvestmentTableField,
    stringValue: string,
  ): number | string | null {
    if (field.type === 'decimal') {
      return amountToInteger(evalArithmetic(stringValue));
    } else if (field.type === 'currency') {
      return currencyToInteger(stringValue);
    }
    return stringValue;
  }

  async function onAdd(holding: HoldingEntity) {
    await send('holding-add', holding);
    clearNewHolding();
  }

  return (
    <View
      style={{ flex: 1, overflow: 'hidden' }}
      data-testid="transaction-table"
    >
      <InvestmentTableHeader
        fields={fields}
        orderBy={orderBy}
        onOrderBy={onOrderBy}
      />
      <View {...tableNavigator.getNavigatorProps({})}>
        {newHolding && (
          <View>
            <Holding
              fields={fields}
              holding={newHolding}
              editing={tableNavigator.editingId === newHolding.id}
              onEdit={tableNavigator.onEdit}
              focusedField={tableNavigator.focusedField}
              onUpdate={onUpdateNew}
            />
            <View
              style={{
                display: 'flex',
                justifyContent: 'end',
                flexDirection: 'row',
                gap: 3,
                padding: 3,
              }}
            >
              <Button onPress={clearNewHolding}>Cancel</Button>
              <Button variant="primary" onPress={() => onAdd(newHolding)}>
                Create
              </Button>
            </View>
          </View>
        )}
      </View>
      <Table
        navigator={tableNavigator}
        items={holdings}
        renderItem={({ item: holding, editing }) => (
          <Holding
            fields={fields}
            holding={holding}
            editing={editing}
            onEdit={tableNavigator.onEdit}
            focusedField={tableNavigator.focusedField}
            onUpdate={onUpdate}
          />
        )}
      />
    </View>
  );
}
type HoldingProps = {
  fields: InvestmentTableField[];
  focusedField: string;
  holding: HoldingEntity;
  editing: boolean;
  onEdit: (id: HoldingEntity['id'], value: string) => void;
  onUpdate: (
    id: HoldingEntity['id'],
    field: InvestmentTableField,
    value: string,
  ) => void;
};

function Holding({
  fields,
  holding,
  editing,
  focusedField,
  onEdit,
  onUpdate,
}: HoldingProps) {
  function fieldValue(field: InvestmentTableField): string {
    const value = holding[field.name];
    if (field.type === 'decimal') {
      return integerToAmount((value as number) ?? 0).toFixed(2);
    } else if (field.type === 'currency') {
      return '$' + integerToAmount((value as number) ?? 0).toFixed(2);
    }
    return (holding[field.name] ?? '') as string;
  }

  return (
    <Row key={holding.id}>
      {fields.map(field => (
        <InputCell
          key={field.name}
          width={field.name === 'title' ? 'flex' : 100}
          name={field.name}
          textAlign="flex"
          value={fieldValue(field)}
          exposed={editing && focusedField === field.name}
          focused={editing && focusedField === field.name}
          onExpose={value => onEdit(holding.id, value)}
          onUpdate={value => onUpdate(holding.id, field, value)}
          privacyFilter={field.type === 'decimal' || field.type === 'currency'}
        />
      ))}
    </Row>
  );
}

type InvestmentTableHeaderProps = {
  fields: InvestmentTableField[];
  onOrderBy: (field: keyof HoldingEntity) => void;
  orderBy: { [key: string]: 'asc' | 'desc' };
};

function InvestmentTableHeader({
  fields,
  orderBy,
  onOrderBy,
}: InvestmentTableHeaderProps) {
  const { t } = useTranslation();

  return (
    <Row
      style={{
        fontWeight: 300,
        zIndex: 200,
        color: theme.tableHeaderText,
        backgroundColor: theme.tableBackground,
        paddingRight: `${5}px`,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
      }}
    >
      {fields.map(f => (
        <HeaderCell
          key={`investment-header-${f.name}`}
          value={t(
            // format value_value to Value Value
            f.name
              .split('_')
              .map(p => p[0].toUpperCase() + p.slice(1))
              .join(' '),
          )}
          icon={orderBy[f.name]}
          width={f.name === 'title' ? 'flex' : 100}
          alignItems="flex"
          marginLeft={-5}
          id={f}
          onClick={() => onOrderBy(f.name)}
        />
      ))}
    </Row>
  );
}

type HeaderCellProps = {
  value: string;
  id: string;
  width: string | number;
  alignItems: string;
  marginLeft: number;
  marginRight: number;
  icon?: 'asc' | 'desc';
  onClick: () => void;
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
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    color: theme.tableHeaderText,
    fontWeight: 300,
    marginLeft,
    marginRight,
  } as CSSProperties;

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
