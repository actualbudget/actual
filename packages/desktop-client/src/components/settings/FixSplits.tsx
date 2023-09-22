import React, { useState } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';
import { type Handlers } from 'loot-core/src/types/handlers';

import { theme } from '../../style';
import { ButtonWithLoading } from '../common/Button';
import Paragraph from '../common/Paragraph';
import Text from '../common/Text';
import View from '../common/View';

import { Setting } from './UI';

type Results = Awaited<ReturnType<Handlers['tools/fix-split-transactions']>>;

function renderResults(results: Results) {
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
      result += `Fixed ${numDeleted} splits that weren’t properly deleted.`;
    }
  }

  return (
    <Paragraph
      style={{
        color: theme.alt3NoticeText,
        marginBottom: 0,
        marginLeft: '1em',
        textAlign: 'right',
        whiteSpace: 'pre-wrap',
      }}
    >
      {result}
    </Paragraph>
  );
}

export default function FixSplitsTool() {
  let [loading, setLoading] = useState(false);
  let [results, setResults] = useState<Results>(null);

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
            alignItems: 'center',
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
        does not help, this tool may fix them. Some examples of bugs include
        seeing blank payees on splits or incorrect account balances. This tool
        does two things:
      </Text>
      <ul style={{ margin: 0, paddingLeft: '1.5em' }}>
        <li style={{ marginBottom: '0.5em' }}>
          Ensures that deleted split transactions are fully deleted. In previous
          versions of the app, certain split transactions may appear deleted but
          not all of them are actually deleted. This causes the transactions
          list to look correct, but certain balances may be incorrect when
          filtering.
        </li>
        <li>
          Sync the payee and cleared flag of a split transaction to the main or
          “parent” transaction, if appropriate. The payee will only be set if it
          currently doesn’t have one.
        </li>
      </ul>
    </Setting>
  );
}
