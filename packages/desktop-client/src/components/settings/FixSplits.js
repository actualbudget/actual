import React, { useState } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';
import {
  View,
  Text,
  P,
  ButtonWithLoading
} from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import { Setting } from './UI';

function renderResults(results) {
  let { numBlankPayees, numCleared, numDeleted } = results;
  let result = '';
  if (numBlankPayees === 0 && numCleared === 0 && numDeleted === 0) {
    result = 'No split transactions found needing repair.';
  } else {
    if (numBlankPayees > 0) {
      result += `Fixed ${numBlankPayees} splits with a blank payee.`;
    }
    if (numCleared > 0) {
      if (result !== '') {
        result += '\n';
      }
      result += `Fixed ${numCleared} splits with the wrong cleared flag.`;
    }
    if (numDeleted > 0) {
      if (result !== '') {
        result += '\n';
      }
      result += `Fixed ${numDeleted} splits that weren't properly deleted.`;
    }
  }

  return (
    <P
      style={{
        color: colors.g3,
        marginBottom: 0,
        marginLeft: '1em',
        textAlign: 'right',
        whiteSpace: 'pre-wrap'
      }}
    >
      {result}
    </P>
  );
}

export default function FixSplitsTool() {
  let [loading, setLoading] = useState(false);
  let [results, setResults] = useState(null);

  async function onFix() {
    setLoading(true);
    let res = await send('tools/fix-split-transactions');
    setResults(res);
    setLoading(false);
  }

  return (
    <Setting
      primaryAction={
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            maxWidth: 500,
            width: '100%',
            alignItems: 'center'
          }}
        >
          <ButtonWithLoading loading={loading} onClick={onFix}>
            Repair split transactions
          </ButtonWithLoading>
          {results && renderResults(results)}
        </View>
      }
    >
      <Text>
        <strong>Repair split transactions</strong> if you are experiencing bugs
        relating to split transactions and the “Reset budget cache” button above
        does not help. If you see blank payees on splits or account balances (or
        any balances) are incorrect, this tool may fix them.
      </Text>
      <View style={{ alignItems: 'flex-start' }}>
        <P>This tool does two things:</P>
        <P>
          <ul style={{ margin: 0, paddingLeft: '1.5em' }}>
            <li style={{ marginBottom: '1em' }}>
              Ensures that deleted split transactions are fully deleted. In
              previous versions of the app, certain split transactions may
              appear deleted but not all of them are actually deleted. This
              causes the transactions list to look correct, but certain balances
              may be incorrect when filtering.
            </li>
            <li>
              Sync the payee and cleared flag of a split transaction to the main
              or "parent" transaction, if appropriate. The payee will only be
              set if it currently doesn't have one.
            </li>
          </ul>
        </P>
      </View>
    </Setting>
  );
}
