import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { send } from 'loot-core/src/platform/client/fetch';
import { type Handlers } from 'loot-core/src/types/handlers';

import { theme } from '../../style';
import { ButtonWithLoading } from '../common/Button2';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { Setting } from './UI';

type Results = Awaited<ReturnType<Handlers['tools/fix-split-transactions']>>;

function useRenderResults() {
  const { t } = useTranslation();

  function renderResults(results: Results) {
    const { numBlankPayees, numCleared, numDeleted, mismatchedSplits } =
      results;
    const result: string[] = [];

    if (
      numBlankPayees === 0 &&
      numCleared === 0 &&
      numDeleted === 0 &&
      mismatchedSplits.length === 0
    ) {
      result.push(t('No split transactions found needing repair.'));
    } else {
      if (numBlankPayees > 0) {
        result.push(
          t('Fixed {{numBlankPayees}} splits with a blank payee.', {
            numBlankPayees,
          }),
        );
      }
      if (numCleared > 0) {
        result.push(
          t('Fixed {{numCleared}} splits with the wrong cleared flag.', {
            numCleared,
          }),
        );
      }
      if (numDeleted > 0) {
        result.push(
          t('Fixed {{numDeleted}} splits that weren’t properly deleted.', {
            numDeleted,
          }),
        );
      }
      if (mismatchedSplits.length > 0) {
        const mismatchedSplitInfo = mismatchedSplits
          .map(t => `- ${t.date}`)
          .join('\n');
        if (mismatchedSplits.length === 1) {
          result.push(
            t(
              'Found 1 split transaction with mismatched amounts on the below date. Please review it manually:',
            ) + `\n${mismatchedSplitInfo}`,
          );
        } else {
          result.push(
            t(
              'Found {{num}} split transactions with mismatched amounts on the below dates. Please review them manually:',
              { num: mismatchedSplits.length },
            ) + `\n${mismatchedSplitInfo}`,
          );
        }
      }
    }

    return (
      <Paragraph
        style={{
          color:
            mismatchedSplits.length === 0
              ? theme.noticeTextLight
              : theme.errorText,
          whiteSpace: 'pre-wrap',
        }}
      >
        {result.join('\n')}
      </Paragraph>
    );
  }

  return { renderResults };
}

export function FixSplits() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results | null>(null);

  const { renderResults } = useRenderResults();

  async function onFix() {
    setLoading(true);
    const res = await send('tools/fix-split-transactions');

    setResults(res);
    setLoading(false);
  }

  return (
    <Setting
      primaryAction={
        <View
          style={{
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '1em',
          }}
        >
          <ButtonWithLoading isLoading={loading} onPress={onFix}>
            <Trans>Repair split transactions</Trans>
          </ButtonWithLoading>
          {results && renderResults(results)}
        </View>
      }
    >
      <Trans>
        <Text>
          <strong>Repair split transactions</strong> if you are experiencing
          bugs relating to split transactions and the “Reset budget cache”
          button above does not help, this tool may fix them. Some examples of
          bugs include seeing blank payees on splits or incorrect account
          balances. This tool does three things:
        </Text>
        <ul style={{ margin: 0, paddingLeft: '1.5em' }}>
          <li style={{ marginBottom: '0.5em' }}>
            Ensures that deleted split transactions are fully deleted. In
            previous versions of the app, certain split transactions may appear
            deleted but not all of them are actually deleted. This causes the
            transactions list to look correct, but certain balances may be
            incorrect when filtering.
          </li>
          <li>
            Sync the payee and cleared flag of a split transaction to the main
            or “parent” transaction, if appropriate. The payee will only be set
            if it currently doesn’t have one.
          </li>
          <li>
            Checks that the sum of all child transactions adds up to the total
            amount. If not, these will be flagged below to allow you to easily
            locate and fix the amounts.
          </li>
        </ul>
      </Trans>
    </Setting>
  );
}
