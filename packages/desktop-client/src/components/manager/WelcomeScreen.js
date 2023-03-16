import React from 'react';
import { connect } from 'react-redux';

import * as actions from 'loot-core/src/client/actions';
import {
  View,
  Button,
  Text,
  P,
  ExternalLink,
} from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';

function WelcomeScreen({ createBudget, pushModal }) {
  return (
    <View style={{ maxWidth: 500, fontSize: 15 }}>
      <Text
        style={[styles.veryLargeText, { marginBlock: 20, textAlign: 'center' }]}
      >
        Welcome to Actual!
      </Text>
      <P>
        Actual is a personal finance tool that focuses on beautiful design and a
        slick user experience.{' '}
        <strong>Editing your data should be as fast as possible.</strong> On top
        of that, we want to provide powerful tools to allow you to do whatever
        you want with your data.
      </P>
      <P>
        Currently Actual implements budgeting based on a{' '}
        <ExternalLink
          asAnchor
          style={{ color: colors.p5 }}
          href="https://actualbudget.github.io/docs/Budgeting/howitworks"
        >
          monthly envelope system
        </ExternalLink>
        . In the future, we’ll support multiple ways to do budgeting. We’re also
        working hard on custom reports and a lot more things.
      </P>
      <P
        style={{
          fontWeight: 600,
          '& a, & a:visited': { color: colors.p5 },
        }}
      >
        Read the{' '}
        <ExternalLink asAnchor href="https://actualbudget.github.io/docs/">
          documentation
        </ExternalLink>{' '}
        to get started and learn about{' '}
        <ExternalLink
          asAnchor
          href="https://actualbudget.github.io/docs/Budgeting/howitworks"
        >
          budgeting
        </ExternalLink>
        ,{' '}
        <ExternalLink
          asAnchor
          href="https://actualbudget.github.io/docs/Accounts/overview"
        >
          accounts
        </ExternalLink>{' '}
        and more.
      </P>
      <P style={{ color: colors.n5 }}>
        Get started by importing an existing budget file from Actual or another
        budgeting app, or start fresh with an empty budget. You can always
        create or import another budget later.
      </P>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <Button
          onClick={() => {
            pushModal('import');
          }}
        >
          Import your data
        </Button>
        <Button primary onClick={createBudget}>
          Start fresh
        </Button>
      </View>
    </View>
  );
}

export default connect(null, actions)(WelcomeScreen);
