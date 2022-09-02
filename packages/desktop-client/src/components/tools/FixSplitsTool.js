import React, { useState } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';
import { colors } from 'loot-design/src/style';
import { View, P, ButtonWithLoading } from 'loot-design/src/components/common';

import { Page } from '../Page';

function renderResults(results) {
  let { numBlankPayees, numCleared, numDeleted } = results;
  if (numBlankPayees === 0 && numCleared === 0 && numDeleted === 0) {
    return (
      <P style={{ alignSelf: 'center', color: colors.g3 }}>
        No split transactions found needing repair.
      </P>
    );
  }

  let fixed = '';
  if (numBlankPayees > 0) {
    fixed += `${numBlankPayees} split transactions with a blank payee`;
  }
  if (numCleared > 0) {
    if (fixed !== '') {
      fixed += ', and ';
    }
    fixed += `${numCleared} split transactions with the wrong cleared flag`;
  }
  if (numDeleted > 0) {
    if (fixed !== '') {
      fixed += ', and ';
    }
    fixed += `${numDeleted} split transactions that weren't properly deleted`;
  }

  return (
    <P style={{ alignSelf: 'center', color: colors.g3 }}>Fixed {fixed}.</P>
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
    <Page title="Repair Split Transactions" modalSize={{ width: 650 }}>
      <View style={{ alignItems: 'flex-start' }}>
        <P>This tool does two things:</P>
        <P>
          <ul style={{ margin: 0 }}>
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
        <P>
          If you see blank payees on splits or account balances (or any
          balances) are incorrect, this may fix it.
        </P>
        <ButtonWithLoading
          primary
          loading={loading}
          onClick={onFix}
          style={{ alignSelf: 'center', margin: '15px 0' }}
        >
          Repair split transactions
        </ButtonWithLoading>
        {results && renderResults(results)}
      </View>
    </Page>
  );
}
