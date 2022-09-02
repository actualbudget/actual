import React from 'react';
import { connect } from 'react-redux';

import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';
import { P, View, Text, Button } from 'loot-design/src/components/common';
import NamespaceContext from 'loot-design/src/components/spreadsheet/NamespaceContext';
import SheetValue from 'loot-design/src/components/spreadsheet/SheetValue';

import { Standalone, Title, useMinimized } from './common';
import Navigation from './Navigation';

function Overspending({ navigationProps, stepTwo }) {
  let currentMonth = monthUtils.currentMonth();
  let sheetName = monthUtils.sheetForMonth(currentMonth);
  let month = monthUtils.format(currentMonth, 'MMM');
  let [minimized, toggle] = useMinimized();

  return (
    <NamespaceContext.Provider value={sheetName}>
      <SheetValue binding={{ name: 'total-spent' }}>
        {({ value: spentTotal }) => {
          return (
            <Standalone width={400}>
              <Title>Overspending</Title>
              {!minimized &&
                (stepTwo ? (
                  <View>
                    <P>
                      The category balance becomes negative. Next month will
                      reset this balance to zero, and you'll see it in
                      "Overspent in {month}" in next month's summary, which in
                      turn takes it out of next month's "To Budget" amount.{' '}
                    </P>

                    <P isLast={true}>
                      <strong>
                        When you overspend, it's taken out of next month's
                        available budget.
                      </strong>{' '}
                      A simple workflow would be to just take it out of next
                      month's savings, or whatever you like.
                    </P>
                  </View>
                ) : (
                  <View>
                    <P>
                      What happens when you overspend? Let
                      {"'"}s find out.
                      {spentTotal === 0 && (
                        <Text>
                          You haven't spent any money yet so add some expenses
                          in your account to see it in action.
                        </Text>
                      )}
                    </P>

                    <P isLast={true}>
                      {spentTotal !== 0 && (
                        <Text>
                          You've spent{' '}
                          <strong>
                            ${integerToCurrency(Math.abs(spentTotal))}
                          </strong>
                          .
                        </Text>
                      )}{' '}
                      Try zeroing out a budget for a category that already has
                      spent money in it. You'll see how overspending works.
                    </P>
                  </View>
                ))}

              <Navigation
                {...navigationProps}
                leftContent={
                  <Button bare onClick={toggle}>
                    {minimized ? 'Show more' : 'Show less'}
                  </Button>
                }
              />
            </Standalone>
          );
        }}
      </SheetValue>
    </NamespaceContext.Provider>
  );
}

export default connect(null, dispatch => bindActionCreators(actions, dispatch))(
  Overspending
);
