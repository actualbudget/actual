import React from 'react';

import { css } from 'glamor';

import { P } from 'loot-design/src/components/common';

import { Standalone } from './common';
import Navigation from './Navigation';

function TransactionFinalize({ navigationProps }) {
  return (
    <Standalone width={400}>
      <P style={{ fontSize: 16 }}>All done!</P>
      <P isLast={true}>
        You can edit transactions by clicking anywhere on the table, or move
        around with the keyboard. A few keybindings:
        <ul {...css({ padding: '0 15px', '& li': { marginTop: 5 } })}>
          <li>
            Tab and enter are the same and will move right (holding shift will
            move left).
          </li>
          <li>Alt or command with arrow keys will move in any direction.</li>
        </ul>
      </P>

      <Navigation {...navigationProps} />
    </Standalone>
  );
}

export default TransactionFinalize;
