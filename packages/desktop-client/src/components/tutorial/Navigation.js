import React from 'react';

import { Button, ModalButtons } from 'loot-design/src/components/common';

function Navigation({
  nextTutorialStage,
  previousTutorialStage,
  closeTutorial,
  showBack = true,
  showNext = true,
  leftContent,
  disableNext
}) {
  return (
    <ModalButtons leftContent={leftContent} style={{ marginTop: 20 }}>
      <Button onClick={() => closeTutorial()}>Close</Button>
      {showBack && (
        <Button
          onClick={() => previousTutorialStage()}
          style={{ marginLeft: 10 }}
        >
          Back
        </Button>
      )}
      {showNext && (
        <Button
          primary
          onClick={() => nextTutorialStage()}
          disabled={disableNext}
          style={{ marginLeft: 10 }}
        >
          Next
        </Button>
      )}
    </ModalButtons>
  );
}

export default Navigation;
