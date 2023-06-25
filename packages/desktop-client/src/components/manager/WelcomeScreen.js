import React from 'react';
import { connect } from 'react-redux';

import * as actions from 'loot-core/src/client/actions';

import { colors, styles } from '../../style';
import { View, Button, Text, P, ExternalLink } from '../common';

function WelcomeScreen({ createBudget, pushModal }) {
  return (
    <View
      style={{
        gap: 10,
        maxWidth: 500,
        fontSize: 15,
        maxHeight: '100vh',
        marginBlock: 20,
      }}
    >
      <Text style={styles.veryLargeText}>Let’s get started!</Text>
      <View style={{ overflowY: 'auto' }}>
        <P>
          Actual is a personal finance tool that focuses on beautiful design and
          a slick user experience.{' '}
          <strong>Editing your data should be as fast as possible.</strong> On
          top of that, we want to provide powerful tools to allow you to do
          whatever you want with your data.
        </P>
        <P>
          Currently, Actual implements budgeting based on a{' '}
          <ExternalLink
            to="https://actualbudget.org/docs/budgeting/"
            linkColor="purple"
          >
            monthly envelope system
          </ExternalLink>
          . Consider taking our{' '}
          <ExternalLink
            to="https://actualbudget.org/docs/tour/"
            linkColor="purple"
          >
            guided tour
          </ExternalLink>{' '}
          to help you get your bearings, and check out the rest of the
          documentation while you’re there to learn more about advanced topics.
        </P>
        <P style={{ color: colors.n5 }}>
          Get started by importing an existing budget file from Actual or
          another budgeting app, or start fresh with an empty budget. You can
          always create or import another budget later.
        </P>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexShrink: 0,
        }}
      >
        <Button onClick={() => pushModal('import')}>Import my budget</Button>
        <Button primary onClick={createBudget}>
          Start fresh
        </Button>
      </View>
    </View>
  );
}

export default connect(null, actions)(WelcomeScreen);
