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

import {
  TransactionForm,
  TransactionFormProvider,
  useTransactionFormDispatch,
  useTransactionFormState,
} from './TransactionForm';

import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import { getPrettyPayee } from '@desktop-client/components/mobile/utils';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { usePayees } from '@desktop-client/hooks/usePayees';
import { useTransactions } from '@desktop-client/hooks/useTransactions';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

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
    (trans: TransactionEntity) => {
      return trans?.payee ? payeesById?.[trans.payee] : null;
    },
    [payeesById],
  );

  const getTransferAccount = useCallback(
    (trans: TransactionEntity) => {
      const payee = trans && getPayee(trans);
      return payee?.transfer_acct ? accountsById?.[payee.transfer_acct] : null;
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

  return (
    <TransactionFormProvider transactions={transactions}>
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
        footer={<Footer transactions={transactions} />}
        padding={0}
      >
        {isLoading ? (
          <AnimatedLoading width={15} height={15} />
        ) : (
          <TransactionForm transactions={transactions} />
        )}
      </Page>
    </TransactionFormProvider>
  );
}

type FooterProps = {
  transactions: ReadonlyArray<TransactionEntity>;
};

function Footer({ transactions }: FooterProps) {
  const { transactionId } = useParams();
  const isAdding = !transactionId;
  const [transaction, ...childTransactions] = transactions;
  const emptySplitTransaction = childTransactions.find(t => t.amount === 0);

  const transactionFormDispatch = useTransactionFormDispatch();

  const onClickRemainingSplit = () => {
    if (!transaction) {
      return;
    }

    if (childTransactions.length === 0) {
      transactionFormDispatch({ type: 'split' });
    } else {
      if (!emptySplitTransaction) {
        transactionFormDispatch({ type: 'add-split' });
      } else {
        transactionFormDispatch({
          type: 'focus',
          id: emptySplitTransaction.id,
        });
      }
    }
  };

  const dispatch = useDispatch();

  const onSelectAccount = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'account-autocomplete',
          options: {
            onSelect: (accountId: string) => {
              transactionFormDispatch({
                type: 'set-account',
                account: accountId,
              });
            },
          },
        },
      }),
    );
  };

  const navigate = useNavigate();

  const onSubmit = () => {
    transactionFormDispatch({ type: 'submit' });
    navigate(-1);
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
          onPress={onSelectAccount}
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
          // onPress={onSubmit}
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
          onPress={onSubmit}
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
