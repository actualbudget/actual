import React from 'react';
import { connect } from 'react-redux';

import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import { View, P, Button } from 'loot-design/src/components/common';

import { Standalone, Title, useMinimized } from './common';
import Navigation from './Navigation';

function BudgetNextMonth({ stepTwo, navigationProps }) {
  let [minimized, toggle] = useMinimized();

  return (
    <Standalone width={500}>
      <Title>Budgeting the next month</Title>
      {!minimized &&
        (!stepTwo ? (
          <View>
            <P>
              When a new month comes around, you distribute money again to fund
              each category for the new month. Move to the next month by
              clicking the right arrow.
            </P>

            <P isLast={true}>
              Tip: Show multiple months at once with the control in the top left
              of the screen.
            </P>
          </View>
        ) : (
          <View>
            <P>
              It's easier this time though! Just hover over the new month and
              click 3 dots menu and select "Copy last month's budget" to use the
              same budget as last month.
            </P>

            <P isLast={true}>
              You likely need to tweak the budget for the new month, depending
              on overspending and other factors. That's ok! Adjusting your
              budget as life happens is crucial to a realistic budget.
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
}

export default connect(null, dispatch => bindActionCreators(actions, dispatch))(
  BudgetNextMonth
);
