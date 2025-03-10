import { holdings } from 'loot-core/client/queries';
import { useQuery } from 'loot-core/client/query-hooks';
import { HoldingEntity } from 'loot-core/types/models/holding';
import {
  CustomCell,
  InputCell,
  Row,
  Table,
  UnexposedCellContent,
  useTableNavigator,
} from '../../table';
import { AccountEntity } from 'loot-core/types/models';
import { useState } from 'react';
import { View } from '@actual-app/components/view';
import { theme } from '@actual-app/components/theme';
import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { SvgArrowDown, SvgArrowUp } from '@actual-app/components/icons/v1';
import { CSSProperties } from '@actual-app/components/styles';
import { useTranslation } from 'react-i18next';
import {
  amountToInteger,
  currencyToInteger,
  integerToAmount,
} from 'loot-core/shared/util';
import { send } from 'loot-core/platform/client/fetch';
import { evalArithmetic } from 'loot-core/shared/arithmetic';
import { v4 as uuidV4 } from 'uuid';

export type InvestmentAccountProps = {
  account: AccountEntity;
};

export function InvestmentAccount({ account }: InvestmentAccountProps) {
  const holdingsQuery = useQuery<HoldingEntity>(
    () => holdings(account.id).select('*'),
    [account],
  );
  const holdingsData = (holdingsQuery.data || []) as HoldingEntity[];

  return <InvestmentTable account={account} holdings={holdingsData} />;
}

export type InvestmentTableProps = {
  account: AccountEntity;
  holdings: HoldingEntity[];
};

type InvestmentTableField = {
  name: keyof HoldingEntity;
  type: 'string' | 'decimal' | 'currency';
};

export function InvestmentTable({ account, holdings }: InvestmentTableProps) {
  const fields: InvestmentTableField[] = [
    { name: 'symbol', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'shares', type: 'decimal' },
    { name: 'market_value', type: 'currency' },
    { name: 'purchase_price', type: 'currency' },
  ];
  const tableNavigator = useTableNavigator(
    holdings,
    fields.map(f => f.name),
  );
  const [newHolding, setNewHolding] = useState<HoldingEntity | undefined>(
    undefined,
  );
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
  ): any {
    if (field.type === 'decimal') {
      return amountToInteger(evalArithmetic(stringValue));
    } else if (field.type === 'currency') {
      return currencyToInteger(stringValue);
    }
    return stringValue;
  }

  async function onAdd(holding: HoldingEntity) {
    await send('holding-add', holding);
  }

  return (
    <View
      style={{ flex: 1, overflow: 'hidden' }}
      data-testid="transaction-table"
    >
      <View>
        <Button
          variant="primary"
          onPress={() =>
            setNewHolding({
              id: uuidV4(),
              account: account.id,
            } as HoldingEntity)
          }
          style={{ display: 'flex', flexDirection: 'row' }}
        >
          New
        </Button>
      </View>
      <InvestmentTableHeader fields={fields} />
      {newHolding && (
        <View {...tableNavigator.getNavigatorProps({})}>
          <Holding
            fields={fields}
            holding={newHolding}
            editing={tableNavigator.editingId === newHolding.id}
            onEdit={tableNavigator.onEdit}
            focusedField={tableNavigator.focusedField}
            onUpdate={onUpdateNew}
          />
          <View style={{ display: 'flex', justifyContent: 'end' }}>
            <Button onPress={() => setNewHolding(undefined)}>Cancel</Button>
            <Button variant="primary" onPress={() => onAdd(newHolding)}>
              Create
            </Button>
          </View>
        </View>
      )}
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
        />
      ))}
    </Row>
  );
}

type InvestmentTableHeaderProps = {
  fields: InvestmentTableField[];
};

function InvestmentTableHeader({ fields }: InvestmentTableHeaderProps) {
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
          width={f.name === 'title' ? 'flex' : 100}
          alignItems="flex"
          marginLeft={-5}
          id={f}
          icon={'clickable'}
          onClick={console.log}
        />
      ))}
    </Row>
  );
}

function HeaderCell({
  value,
  id,
  width,
  alignItems,
  marginLeft,
  marginRight,
  icon,
  onClick,
}: any) {
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
