import React from 'react';
import { connect } from 'react-redux';

import * as actions from 'loot-core/src/client/actions';
import {
  View,
  Modal,
  P,
  ExternalLink
} from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

function WelcomeScreen({ modalProps, actions }) {
  return (
    <Modal title="Welcome to Actual" {...modalProps}>
      {() => (
        <View style={{ maxWidth: 500, fontSize: 15 }}>
          <P>
            Actual is a personal finance tool that focuses on beautiful design
            and a slick user experience.{' '}
            <strong>Editing your data should be as fast as possible.</strong> On
            top of that, we want to provide powerful tools to allow you to do
            whatever you want with your data.
          </P>
          <P>
            Currently Actual implements budgeting based on a{' '}
            <ExternalLink
              asAnchor
              href="https://actualbudget.github.io/docs/Budgeting/howitworks"
            >
              monthly envelope system
            </ExternalLink>
            .
          </P>
          <P>
            In the future, we{"'"}ll support multiple ways to do budgeting. We
            {"'"}re also working hard on custom reports and a lot more things.
          </P>
          <P
            style={{
              color: colors.p5,
              fontWeight: 600,
              '& a, & a:visited': { color: colors.p5 }
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
        </View>
      )}
    </Modal>
  );
}

export default connect(null, actions)(WelcomeScreen);
