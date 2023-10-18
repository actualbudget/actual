import React from 'react';
import { useSelector } from 'react-redux';

import { theme } from '../../style';
import View from '../common/View';
import { Row, Field, Cell } from '../table';

export default function ReportsTable({ data, months, style, type, split }) {
  let { payees, accounts, dateFormat } = useSelector(state => {
    return {
      payees: state.queries.payees,
      accounts: state.queries.accounts,
      dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy',
    };
  });

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
                  key={field[typeItem]}
                  value={field[typeItem]}
                  width="flex"
                />
              );
            })}
            <Cell value={item[totalItem]} width="flex" />
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
              key={header[totalItem]}
              value={header[totalItem]}
              width="flex"
            />
          );
        })}
        <Cell width="flex" />
      </Row>
    </View>
  );
}
