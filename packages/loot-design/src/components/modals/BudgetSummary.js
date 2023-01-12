import React from 'react';

import { rolloverBudget } from 'loot-core/src/client/queries';
import * as monthUtils from 'loot-core/src/shared/months';
import CellValue from 'loot-design/src/components/spreadsheet/CellValue';
import format from 'loot-design/src/components/spreadsheet/format';
import NamespaceContext from 'loot-design/src/components/spreadsheet/NamespaceContext';
import SheetValue from 'loot-design/src/components/spreadsheet/SheetValue';

import { colors, styles } from '../../style';
import { View, Text, Modal, Button } from '../common';

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
              paddingBottom: 15
            }}
          >
            <View
              style={[
                styles.text,
                {
                  fontWeight: '600',
                  textAlign: 'right',
                  marginRight: 10
                }
              ]}
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
              style={[
                styles.text,
                {
                  display: 'flex',
                  flexDirection: 'column',
                  textAlign: 'left'
                }
              ]}
            >
              <Text>Available Funds</Text>
              <Text>Overspent in {prevMonthName}</Text>
              <Text>Budgeted</Text>
              <Text>For Next Month</Text>
            </View>
          </View>

          <View style={{ alignItems: 'center', marginBottom: 15 }}>
            <SheetValue binding={rolloverBudget.toBudget}>
              {({ value: amount }) => {
                return (
                  <>
                    <Text style={styles.text}>
                      {amount < 0 ? 'Overbudget:' : 'To budget:'}
                    </Text>
                    <Text
                      style={[
                        styles.text,
                        {
                          fontWeight: '600',
                          fontSize: 22,
                          color: amount < 0 ? colors.r4 : colors.n1
                        }
                      ]}
                    >
                      {format(amount, 'financial')}
                    </Text>
                  </>
                );
              }}
            </SheetValue>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              paddingBottom: 15
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
