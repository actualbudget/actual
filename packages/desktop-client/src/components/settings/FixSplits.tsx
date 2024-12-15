import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { send } from 'loot-core/src/platform/client/fetch';
import { type Handlers } from 'loot-core/src/types/handlers';

import { theme } from '../../style';
import { ButtonWithLoading } from '../common/Button2';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { Setting } from './UI';

type Results = Awaited<ReturnType<Handlers['tools/fix-split-transactions']>>;

function renderResults(results: Results) {
  const { numBlankPayees, numCleared, numDeleted, mismatchedSplits } = results;
  const result: string[] = [];

  if (
    numBlankPayees === 0 &&
    numCleared === 0 &&
    numDeleted === 0 &&
    mismatchedSplits.length === 0
  ) {
    result.push('No split transactions found needing repair.');
  } else {
    if (numBlankPayees > 0) {
      result.push(`Fixed ${numBlankPayees} splits with a blank payee.`);
    }
    if (numCleared > 0) {
      result.push(`Fixed ${numCleared} splits with the wrong cleared flag.`);
    }
    if (numDeleted > 0) {
      result.push(`Fixed ${numDeleted} splits that weren’t properly deleted.`);
    }
    if (mismatchedSplits.length > 0) {
      result.push(
        `Found ${mismatchedSplits.length} split transaction${mismatchedSplits.length > 1 ? 's' : ''} ` +
          `with mismatched amounts on the below date${mismatchedSplits.length > 1 ? 's' : ''}. ` +
          `Please fix ${mismatchedSplits.length > 1 ? 'these' : 'this'} manually:\n` +
          mismatchedSplits.map(t => `- ${t.date}`).join('\n'),
      );
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

export function FixSplits() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Results | null>(null);

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
            {t('Repair split transactions')}
          </ButtonWithLoading>
          {results && renderResults(results)}
        </View>
      }
    >
      <Text>
        <strong>{t('Repair split transactions')}</strong>
        {t(
          ' if you are experiencing bugs relating to split transactions and the “Reset budget cache” button above does not help, this tool may fix them. Some examples of bugs include seeing blank payees on splits or incorrect account balances. This tool does two things:',
        )}
      </Text>
      <ul style={{ margin: 0, paddingLeft: '1.5em' }}>
        <li style={{ marginBottom: '0.5em' }}>
          {t(
            'Ensures that deleted split transactions are fully deleted. In previous versions of the app, certain split transactions may appear deleted but not all of them are actually deleted. This causes the transactions list to look correct, but certain balances may be incorrect when filtering.',
          )}
        </li>
        <li>
          {t(
            'Sync the payee and cleared flag of a split transaction to the main or “parent” transaction, if appropriate. The payee will only be set if it currently doesn’t have one.',
          )}
        </li>
      </ul>
    </Setting>
  );
}
