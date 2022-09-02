import React from 'react';
import { connect } from 'react-redux';

import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import { P, Button } from 'loot-design/src/components/common';

import { Title, Standalone, useMinimized } from './common';
import Navigation from './Navigation';

function BudgetInitial({ accounts, navigationProps }) {
  let [minimized, toggle] = useMinimized();

  return (
    <Standalone>
      <Title>Go ahead and budget your money</Title>
      {!minimized && (
        <React.Fragment>
          <P>
            You should see all of your current accounts' balance available to
            budget. Click on the budgeted column for a category create a budget.
            Keep doing this until your "To Budget" amount is zero.
          </P>
          <P>
            Don't worry too much about your initial budget. Just guess. You'll
            learn more about your spending in the first couple months.
          </P>
        </React.Fragment>
      )}
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

export default connect(
  state => ({
    accounts: state.queries.accounts
  }),
  dispatch => bindActionCreators(actions, dispatch)
)(BudgetInitial);
