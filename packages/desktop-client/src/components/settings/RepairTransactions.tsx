import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ButtonWithLoading } from '@actual-app/components/button';
import { Paragraph } from '@actual-app/components/paragraph';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { send } from '@actual-app/core/platform/client/connection';
import type { Handlers } from '@actual-app/core/types/handlers';

import { SettingsRow } from './SettingsRow';

type Results = Awaited<ReturnType<Handlers['tools/fix-split-transactions']>>;

function useRenderResults() {
  const { t } = useTranslation();

  function renderResults(results: Results) {
    const {
      numBlankPayees,
      numCleared,
      numDeleted,
      numTransfersFixed,
      mismatchedSplits,
      numNonParentErrorsFixed,
      numParentTransactionsWithCategoryFixed,
    } = results;
    const result: string[] = [];

    if (
      numBlankPayees === 0 &&
      numCleared === 0 &&
      numDeleted === 0 &&
      numTransfersFixed === 0 &&
      numNonParentErrorsFixed === 0 &&
      mismatchedSplits.length === 0 &&
      numParentTransactionsWithCategoryFixed === 0
    ) {
      result.push(t('No split transactions found needing repair.'));
    } else {
      if (numBlankPayees > 0) {
        result.push(
          t('Fixed {{count}} splits with a blank payee.', {
            count: numBlankPayees,
          }),
        );
      }
      if (numCleared > 0) {
        result.push(
          t('Fixed {{count}} splits with the wrong cleared flag.', {
            count: numCleared,
          }),
        );
      }
      if (numDeleted > 0) {
        result.push(
          t("Fixed {{count}} splits that weren't properly deleted.", {
            count: numDeleted,
          }),
        );
      }
      if (numNonParentErrorsFixed > 0) {
        result.push(
          t('Fixed {{count}} non-split transactions with split errors.', {
            count: numNonParentErrorsFixed,
          }),
        );
      }
      if (numTransfersFixed > 0) {
        result.push(
          t('Fixed {{count}} transfers.', {
            count: numTransfersFixed,
          }),
        );
      }
      if (mismatchedSplits.length > 0) {
        const mismatchedSplitInfo = mismatchedSplits
          .map(t => `- ${t.date}`)
          .join('\n');

        result.push(
          t(
            'Found {{count}} split transactions with mismatched amounts on the below dates. Please review them manually:',
            { count: mismatchedSplits.length },
          ) + `\n${mismatchedSplitInfo}`,
        );
      }
      if (numParentTransactionsWithCategoryFixed > 0) {
        result.push(
          t('Fixed {{count}} split transactions with non-null category.', {
            count: numParentTransactionsWithCategoryFixed,
          }),
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

  return { renderResults };
}

export function RepairTransactions() {
  const { t } = useTranslation();
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
    <SettingsRow
      title={t('Split transactions and transfers')}
      description={t(
        'Repairing transactions can fix bugs with split transactions or transfers, such as blank payees on splits or incorrect account balances. Try this if resetting the budget cache does not help.',
      )}
      control={
        <ButtonWithLoading isLoading={loading} onPress={onFix}>
          <Trans>Repair transactions</Trans>
        </ButtonWithLoading>
      }
    >
      <details style={{ ...styles.smallText, lineHeight: 1.5 }}>
        <summary style={{ cursor: 'pointer' }}>
          <Trans>What this repairs</Trans>
        </summary>
        <ul style={{ margin: `${spacing.sm}px 0 0`, paddingLeft: '1.5em' }}>
          <Trans>
            <li>
              Fully deletes split transactions that were only partly deleted,
              which can leave balances wrong when filtering.
            </li>
            <li>
              Copies the payee and cleared flag from a split's parent
              transaction where appropriate. The payee is only set if the split
              has none.
            </li>
            <li>
              Checks that the child transactions add up to the total. Any that
              do not are listed below so you can fix the amounts.
            </li>
            <li>Removes split errors from transactions that are not splits.</li>
            <li>Removes the category from budget transfers that have one.</li>
            <li>
              Removes the category from parent transactions that have one.
            </li>
          </Trans>
        </ul>
      </details>
      {results && renderResults(results)}
    </SettingsRow>
  );
}
