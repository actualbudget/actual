import React from 'react';

import { P, ModalButtons, Button } from '../common';

import { Standalone, Title, ExternalLink } from './common';

function Final({ targetRect, navigationProps }) {
  return (
    <Standalone width={500}>
      <Title>That’s it!</Title>
      <P>
        With that workflow you can have peace of mind that what you are looking
        at reflects reality.{' '}
        <span role="img" aria-label="Relieved smile" aria-hidden="true">
          &#128524;
        </span>{' '}
        The amount of money in a category is cash that you can safely spend
        right now.
      </P>

      <P>
        You probably want to delete the transactions you added and clean up your
        budget. If you have any questions or feedback, please get{' '}
        <a
          href="https://actualbudget.org/contact/"
          target="_blank"
          rel="noopener noreferrer"
        >
          in touch
        </a>
        .
      </P>

      <P isLast={true}>
        Read{' '}
        <ExternalLink asAnchor href="https://actualbudget.org/docs/budgeting/">
          How it Works
        </ExternalLink>{' '}
        for an in-depth explanation of the budgeting workflow.
      </P>

      <ModalButtons style={{ marginTop: 20 }}>
        <Button
          style={{ marginRight: 10 }}
          onClick={() => navigationProps.previousTutorialStage()}
        >
          Back
        </Button>
        <Button onClick={() => navigationProps.endTutorial()} primary>
          End Tutorial
        </Button>
      </ModalButtons>
    </Standalone>
  );
}

export default Final;
