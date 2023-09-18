import React from 'react';

import { rolloverBudget } from 'loot-core/src/client/queries';
import * as monthUtils from 'loot-core/src/shared/months';

import { theme, styles } from '../../style';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Text from '../common/Text';
import View from '../common/View';
import CellValue from '../spreadsheet/CellValue';
import NamespaceContext from '../spreadsheet/NamespaceContext';
import useFormat from '../spreadsheet/useFormat';
import useSheetValue from '../spreadsheet/useSheetValue';

function ToBudget({ toBudget }) {
  let budgetAmount = useSheetValue(toBudget);
  let format = useFormat();
  return (
    <View style={{ alignItems: 'center', marginBottom: 15 }}>
      <Text style={styles.text}>
        {budgetAmount < 0 ? 'Overbudget:' : 'To budget:'}
      </Text>
      <Text
        style={{
          ...styles.text,
          fontWeight: '600',
          fontSize: 22,
          color: budgetAmount < 0 ? theme.errorText : theme.formInputText,
        }}
      >
        {format(budgetAmount, 'financial')}
      </Text>
    </View>
  );
}

function BudgetSummary({ month, modalProps }) {
  const prevMonthName = monthUtils.format(monthUtils.prevMonth(month), 'MMM');

  return (
    <Modal title="Budget Details" {...modalProps} animate>
      {() => (
        <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              paddingTop: 15,
              paddingBottom: 15,
            }}
          >
            <View
              style={{
                ...styles.text,
                fontWeight: '600',
                textAlign: 'right',
                marginRight: 10,
              }}
            >
              <CellValue
                binding={rolloverBudget.incomeAvailable}
                type="financial"
              />
              <CellValue
                binding={rolloverBudget.lastMonthOverspent}
                type="financial"
              />
              <CellValue
                binding={rolloverBudget.totalBudgeted}
                type="financial"
              />
              <CellValue
                binding={rolloverBudget.forNextMonth}
                type="financial"
              />
            </View>

            <View
              style={{
                ...styles.text,
                display: 'flex',
                flexDirection: 'column',
                textAlign: 'left',
              }}
            >
              <Text>Available Funds</Text>
              <Text>Overspent in {prevMonthName}</Text>
              <Text>Budgeted</Text>
              <Text>For Next Month</Text>
            </View>
          </View>
          <ToBudget toBudget={rolloverBudget.toBudget} />

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              paddingBottom: 15,
            }}
          >
            <Button style={{ marginRight: 10 }} onClick={modalProps.onClose}>
              Close
            </Button>
          </View>
        </NamespaceContext.Provider>
      )}
    </Modal>
  );
}

export default BudgetSummary;
