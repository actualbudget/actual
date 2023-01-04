import React from 'react';

import {
  View,
  Text,
  P,
  ModalButtons,
  Button
} from 'loot-design/src/components/common';

import { Standalone, Title, ExternalLink } from './common';

function Intro({ fromYNAB, nextTutorialStage, closeTutorial }) {
  return (
    <Standalone width={500}>
      <Title>Let's get started</Title>
      <P>
        Welcome to Actual!{' '}
        <span role="img" aria-label="Party" aria-hidden="true">
          &#127881;
        </span>{' '}
        <strong>Learn the basic workflow with this quick tutorial.</strong> You
        can always restart it from the File menu.
      </P>

      <P>We also recommend reading these articles:</P>

      <View style={{ lineHeight: '1.5em' }}>
        <Text>
          <ExternalLink
            asAnchor
            href="https://actualbudget.github.io/docs/category/getting-started"
          >
            Getting Started
          </ExternalLink>
          : A guide on what to do first
        </Text>
        <Text>
          <ExternalLink
            asAnchor
            href="https://actualbudget.github.io/docs/Budgeting/howitworks"
          >
            How it Works
          </ExternalLink>
          : An in-depth explanation of the budgeting workflow
        </Text>
      </View>

      <ModalButtons style={{ marginTop: 20 }}>
        <Button style={{ marginRight: 10 }} onClick={() => closeTutorial()}>
          Skip
        </Button>
        <Button
          primary
          onClick={() => {
            if (window.location.hash !== '#/budget') {
              window.location.hash = '#/budget';
              setTimeout(() => {
                nextTutorialStage();
              }, 500);
            } else {
              nextTutorialStage();
            }
          }}
        >
          Start Tutorial
        </Button>
      </ModalButtons>
    </Standalone>
  );
}

export default Intro;
