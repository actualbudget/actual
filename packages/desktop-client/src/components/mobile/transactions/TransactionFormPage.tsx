import {
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import { SvgSplit } from '@actual-app/components/icons/v0';
import { SvgAdd, SvgPiggyBank } from '@actual-app/components/icons/v1';
import { SvgPencilWriteAlternate } from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { q } from 'loot-core/shared/query';
import { groupById, integerToCurrency } from 'loot-core/shared/util';
import { type TransactionEntity } from 'loot-core/types/models';

import { TransactionForm } from './TransactionForm';

import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import { getPrettyPayee } from '@desktop-client/components/mobile/utils';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { useTransactions } from '@desktop-client/hooks/useTransactions';

export function TransactionFormPage() {
  const { t } = useTranslation();
  const { transactionId } = useParams();

  const accounts = useAccounts();
  const accountsById = useMemo(() => groupById(accounts), [accounts]);
  const payees = usePayees();
  const payeesById = useMemo(() => groupById(payees), [payees]);

  // const getAccount = useCallback(
  //   trans => {
  //     return trans?.account && accountsById?.[trans.account];
  //   },
  //   [accountsById],
  // );

  const getPayee = useCallback(
    trans => {
      return trans?.payee && payeesById?.[trans.payee];
    },
    [payeesById],
  );

  const getTransferAccount = useCallback(
    trans => {
      const payee = trans && getPayee(trans);
      return payee?.transfer_acct && accountsById?.[payee.transfer_acct];
    },
    [accountsById, getPayee],
  );

  const transactionsQuery = useMemo(
    () =>
      q('transactions')
        .filter({ id: transactionId })
        .select('*')
        .options({ splits: 'all' }),
    [transactionId],
  );

  const { transactions, isLoading } = useTransactions({
    query: transactionsQuery,
  });
  const [transaction] = transactions;

  const title = getPrettyPayee({
    t,
    transaction,
    payee: getPayee(transaction),
    transferAccount: getTransferAccount(transaction),
  });

  const onSave = useCallback(() => {}, []);
  const onAddSplit = useCallback(() => {}, []);
  const onSplit = useCallback(() => {}, []);
  const onSelectAccount = useCallback(() => {}, []);
  const onEmptySplitFound = useCallback(() => {}, []);

  return (
    <Page
      header={
        <MobilePageHeader
          title={
            !transaction?.payee
              ? !transactionId
                ? t('New Transaction')
                : t('Transaction')
              : title
          }
          leftContent={<MobileBackButton />}
        />
      }
      footer={
        <Footer
          transactions={transactions}
          isAdding={!transactionId}
          onAdd={onSave}
          onSave={onSave}
          onSplit={onSplit}
          onAddSplit={onAddSplit}
          onEmptySplitFound={onEmptySplitFound}
          onSelectAccount={onSelectAccount}
        />
      }
      padding={0}
    >
      {isLoading ? (
        <AnimatedLoading width={15} height={15} />
      ) : (
        <TransactionForm transactions={transactions} />
      )}
    </Page>
  );
}

type FooterProps = {
  transactions: ReadonlyArray<TransactionEntity>;
  isAdding: boolean;
  onAdd: () => void;
  onSave: () => void;
  onSplit: (transactionId: string) => void;
  onAddSplit: (transactionId: string) => void;
  onEmptySplitFound?: (transactionId: string) => void;
  onSelectAccount: (transactionId: string) => void;
};

function Footer({
  transactions,
  isAdding,
  onAdd,
  onSave,
  onSplit,
  onAddSplit,
  onEmptySplitFound,
  onSelectAccount,
}: FooterProps) {
  const [transaction, ...childTransactions] = transactions;
  const emptySplitTransaction = childTransactions.find(t => t.amount === 0);
  const onClickRemainingSplit = () => {
    if (!transaction) {
      return;
    }

    if (childTransactions.length === 0) {
      onSplit(transaction.id);
    } else {
      if (!emptySplitTransaction) {
        onAddSplit(transaction.id);
      } else {
        onEmptySplitFound?.(emptySplitTransaction.id);
      }
    }
  };

  return (
    <View
      data-testid="transaction-form-footer"
      style={{
        padding: `10px ${styles.mobileEditingPadding}px`,
        backgroundColor: theme.tableHeaderBackground,
        borderTopWidth: 1,
        borderColor: theme.tableBorder,
      }}
    >
      {transaction?.error?.type === 'SplitTransactionError' ? (
        <Button
          variant="primary"
          style={{ height: styles.mobileMinHeight }}
          onPress={onClickRemainingSplit}
        >
          <SvgSplit width={17} height={17} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 6,
            }}
          >
            {!emptySplitTransaction ? (
              <Trans>
                Add new split -{' '}
                {{
                  amount: integerToCurrency(
                    transaction.amount > 0
                      ? transaction.error.difference
                      : -transaction.error.difference,
                  ),
                }}{' '}
                left
              </Trans>
            ) : (
              <Trans>
                Amount left:{' '}
                {{
                  amount: integerToCurrency(
                    transaction.amount > 0
                      ? transaction.error.difference
                      : -transaction.error.difference,
                  ),
                }}
              </Trans>
            )}
          </Text>
        </Button>
      ) : !transaction?.account ? (
        <Button
          variant="primary"
          style={{ height: styles.mobileMinHeight }}
          onPress={() => onSelectAccount(transaction.id)}
        >
          <SvgPiggyBank width={17} height={17} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 6,
            }}
          >
            <Trans>Select account</Trans>
          </Text>
        </Button>
      ) : isAdding ? (
        <Button
          variant="primary"
          style={{ height: styles.mobileMinHeight }}
          onPress={onAdd}
        >
          <SvgAdd width={17} height={17} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 5,
            }}
          >
            <Trans>Add transaction</Trans>
          </Text>
        </Button>
      ) : (
        <Button
          variant="primary"
          style={{ height: styles.mobileMinHeight }}
          onPress={onSave}
        >
          <SvgPencilWriteAlternate width={16} height={16} />
          <Text
            style={{
              ...styles.text,
              marginLeft: 6,
            }}
          >
            <Trans>Save changes</Trans>
          </Text>
        </Button>
      )}
    </View>
  );
}

function AutoSizingInput({
  children,
}: {
  children: ({ ref }: { ref: Ref<HTMLInputElement> }) => ReactNode;
}) {
  const textRef = useRef<HTMLSpanElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (textRef.current && inputRef.current) {
      const spanWidth = textRef.current.offsetWidth;
      inputRef.current.style.width = `${spanWidth + 2}px`; // +2 for caret/padding
    }
  }, [inputRef.current?.value]);

  return (
    <>
      {children({ ref: inputRef })}
      {/* Hidden span for measuring text width */}
      <Text
        ref={textRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          ...styles.veryLargeText,
          padding: '0 5px',
        }}
      >
        {inputRef.current?.value || ''}
      </Text>
    </>
  );
}
