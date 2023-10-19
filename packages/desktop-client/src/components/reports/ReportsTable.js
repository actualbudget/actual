import React from 'react';
//import { useSelector } from 'react-redux';

import { amountToCurrency } from 'loot-core/src/shared/util';

import { theme } from '../../style';
import View from '../common/View';
import { Row, Cell } from '../table';

export default function ReportsTable({
  data,
  months,
  style,
  type,
  mode,
  split,
}) {
  /*
  let { payees, accounts, dateFormat } = useSelector(state => {
    return {
      payees: state.queries.payees,
      accounts: state.queries.accounts,
      dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy',
    };
  });
  */

  let typeItem;
  let totalItem;

  switch (type) {
    case 1:
      typeItem = 'debts';
      totalItem = 'totalDebts';
      break;
    case 2:
      typeItem = 'assets';
      totalItem = 'totalAssets';
      break;
    case 3:
      typeItem = 'y';
      totalItem = 'totalTotals';
      break;
    default:
  }

  function TimeTable() {
    return (
      <View
        style={{
          borderRadius: '6px 6px 0 0',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Row
          collapsed={true}
          style={{
            color: theme.tableHeaderText,
            backgroundColor: theme.tableHeaderBackground,
            zIndex: 200,
            fontWeight: 500,
          }}
        >
          <Cell value={split} width="flex" />
          {months.map(header => {
            return <Cell key={header} value={header} width="flex" />;
          })}
          <Cell value={'Totals'} width="flex" />
        </Row>
        {data.data.map(item => {
          return (
            <Row
              key={item.id}
              collapsed={true}
              style={{
                color: theme.tableText,
                backgroundColor: theme.tableBackground,
              }}
            >
              <Cell value={item.name} width="flex" />
              {item.graphData.data.map(field => {
                return (
                  <Cell
                    key={amountToCurrency(field[typeItem])}
                    value={amountToCurrency(field[typeItem])}
                    width="flex"
                  />
                );
              })}
              <Cell value={amountToCurrency(item[totalItem])} width="flex" />
            </Row>
          );
        })}
        <Row
          collapsed={true}
          style={{
            color: theme.tableText,
            backgroundColor: theme.tableBackground,
            zIndex: 200,
            fontWeight: 500,
          }}
        >
          <Cell value={'Totals'} width="flex" />
          {data.monthData.map(header => {
            return (
              <Cell
                key={amountToCurrency(header[totalItem])}
                value={amountToCurrency(header[totalItem])}
                width="flex"
              />
            );
          })}
          <Cell width="flex" />
        </Row>
      </View>
    );
  }

  function TotalTable() {
    return (
      <View
        style={{
          borderRadius: '6px 6px 0 0',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Row
          collapsed={true}
          style={{
            color: theme.tableHeaderText,
            backgroundColor: theme.tableHeaderBackground,
            zIndex: 200,
            fontWeight: 500,
          }}
        >
          <Cell value={split} width="flex" />
          <Cell value={'Totals'} width="flex" />
        </Row>
        {data.data.map(item => {
          return (
            <Row
              key={item.id}
              collapsed={true}
              style={{
                color: theme.tableText,
                backgroundColor: theme.tableBackground,
              }}
            >
              <Cell value={item.name} width="flex" />
              <Cell value={amountToCurrency(item[totalItem])} width="flex" />
            </Row>
          );
        })}
        <Row
          collapsed={true}
          style={{
            color: theme.tableText,
            backgroundColor: theme.tableBackground,
            zIndex: 200,
            fontWeight: 500,
          }}
        >
          <Cell value={'Totals'} width="flex" />
          <Cell
            key={data[totalItem]}
            value={amountToCurrency(data[totalItem])}
            width="flex"
          />
        </Row>
      </View>
    );
  }
  return mode === 'total' ? <TotalTable /> : <TimeTable />;
}
