import React from 'react';

import { useActions } from '../../hooks/useActions';
import { styles, theme } from '../../style';
import Button from '../common/Button';
import ExternalLink from '../common/ExternalLink';
import Paragraph from '../common/Paragraph';
import Text from '../common/Text';
import View from '../common/View';

export default function WelcomeScreen() {
  let { createBudget, pushModal } = useActions();

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
        <Paragraph>
          Actual is a personal finance tool that focuses on beautiful design and
          a slick user experience.{' '}
          <strong>Editing your data should be as fast as possible.</strong> On
          top of that, we want to provide powerful tools to allow you to do
          whatever you want with your data.
        </Paragraph>
        <Paragraph>
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
        </Paragraph>
        <Paragraph style={{ color: theme.altpageTextSubdued }}>
          Get started by importing an existing budget file from Actual or
          another budgeting app, or start fresh with an empty budget. You can
          always create or import another budget later.
        </Paragraph>
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
        <Button type="primary" onClick={createBudget}>
          Start fresh
        </Button>
      </View>
    </View>
  );
}
