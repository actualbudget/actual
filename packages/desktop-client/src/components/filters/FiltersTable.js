import React, { useState, useMemo } from 'react';

import { useCachedAccounts } from 'loot-core/src/client/data-hooks/accounts';
import { useCachedPayees } from 'loot-core/src/client/data-hooks/payees';
import { friendlyOp } from 'loot-core/src/shared/rules';

import DotsHorizontalTriple from '../../icons/v1/DotsHorizontalTriple';
import { colors } from '../../style';
import { View, Text, Button, Tooltip, Menu, Stack } from '../common';
import { ConditionExpression } from '../ManageRules';
import { Table, TableHeader, Row, Field } from '../table';

export let ROW_HEIGHT = 125;

function OverflowMenu({ filter, onAction }) {
  let [open, setOpen] = useState(false);

  return (
    <View>
      <Button
        bare
        onClick={e => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <DotsHorizontalTriple
          width={15}
          height={15}
          style={{ color: 'inherit', transform: 'rotateZ(90deg)' }}
        />
      </Button>
      {open && (
        <Tooltip
          position="bottom-right"
          width={150}
          style={{ padding: 0 }}
          onClose={() => setOpen(false)}
        >
          <Menu
            onMenuSelect={name => {
              onAction(name, filter.id);
              setOpen(false);
            }}
            items={[{ name: 'delete', text: 'Delete' }]}
          />
        </Tooltip>
      )}
    </View>
  );
}

export function FiltersTable({
  filters,
  filter,
  minimal,
  onSelect,
  onAction,
  style,
  tableStyle,
}) {
  let payees = useCachedPayees();
  let accounts = useCachedAccounts();

  let filteredFilters = useMemo(() => {
    if (!filter) {
      return filters;
    }
    const filterIncludes = str =>
      str
        ? str.toLowerCase().includes(filter.toLowerCase()) ||
          filter.toLowerCase().includes(str.toLowerCase())
        : false;

    return filters.filter(filter => {
      let payee = payees.find(p => filter.conditions._payee === p.id);
      let account = accounts.find(a => filter.conditions._account === a.id);
      //let category = category.find(c => filter.conditions._category === c.id);

      return (
        filterIncludes(payee && payee.name) ||
        filterIncludes(account && account.name)
        //filterIncludes(category && category.name)
      );
    });
  }, [filters, filter]);

  let items = useMemo(() => {
    return filteredFilters;
  }, [filteredFilters]);

  function renderFilter({ item }) {
    //let heightCalc = 50 + (25 * (item.conditions.length-1));
    return (
      <Row
        height={ROW_HEIGHT}
        //height="auto"
        inset={15}
        backgroundColor="transparent"
        onClick={() => onSelect(item.id)}
        style={{
          marginBottom: 1,
          cursor: 'pointer',
          backgroundColor: 'white',
          ':hover': { backgroundColor: colors.hover },
        }}
      >
        <Field width="flex" name="name">
          <Text
            style={item.name == null ? { color: colors.n8 } : null}
            title={item.name ? item.name : ''}
          >
            {item.name ? item.name : 'None'}
          </Text>
        </Field>
        <Field width="flex" style={{ padding: '15px 0' }} truncate={false}>
          <Stack direction="row" align="center">
            <View
              style={{ flex: 1, alignItems: 'flex-start' }}
              data-testid="conditions"
            >
              {item.conditions.map((cond, i) => (
                <ConditionExpression
                  key={i}
                  field={cond.field}
                  op={cond.op}
                  inline={true}
                  value={cond.value}
                  options={cond.options}
                  prefix={i > 0 ? friendlyOp(item.conditionsOp) : null}
                  style={i !== 0 && { marginTop: 3 }}
                />
              ))}
            </View>
          </Stack>
        </Field>
        {!minimal && (
          <Field width={40} name="actions">
            <OverflowMenu filter={item} onAction={onAction} />
          </Field>
        )}
      </Row>
    );
  }

  function renderItem({ item }) {
    return renderFilter({ item });
  }

  return (
    <View style={[{ flex: 1 }, tableStyle]}>
      <TableHeader height={43} inset={15} version="v2">
        <Field width="flex">Name</Field>
        <Field width="flex">Filters</Field>
      </TableHeader>
      <Table
        rowHeight={ROW_HEIGHT}
        backgroundColor="transparent"
        version="v2"
        style={[{ flex: 1, backgroundColor: 'transparent' }, style]}
        items={items}
        renderItem={renderItem}
        renderEmpty={filter ? 'No matching filters' : 'No filters'}
        allowPopupsEscape={items.length < 6}
      />
    </View>
  );
}
