import { useState } from 'react';
import type { FormEvent } from 'react';
import { Form } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgExclamationOutline } from '@actual-app/components/icons/v1';
import { Paragraph } from '@actual-app/components/paragraph';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { TransObjectLiteral } from '@actual-app/core/types/util';

import { pairImportedAccount } from '#accounts/importAccount';
import { AccountAutocomplete } from '#components/autocomplete/AccountAutocomplete';
import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { useAccounts } from '#hooks/useAccounts';
import { replaceModal } from '#modals/modalsSlice';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type ImportAccountModalProps = Extract<
  ModalType,
  { name: 'import-account' }
>['options'];

export function ImportAccountModal({
  filename,
  hintId,
  matchedAccountId,
  suggestedAccountId,
  startedFromAccountId,
  onImported,
}: ImportAccountModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { data: accounts = [] } = useAccounts();

  const matched = accounts.find(account => account.id === matchedAccountId);
  const suggested = matched
    ? undefined
    : accounts.find(account => account.id === suggestedAccountId);
  const startedFrom = accounts.find(
    account => account.id === startedFromAccountId,
  );
  const isMismatch =
    !!matched && !!startedFrom && matched.id !== startedFrom.id;

  const [accountId, setAccountId] = useState(matched?.id ?? '');

  function startImport(targetAccountId: string) {
    dispatch(
      replaceModal({
        modal: {
          name: 'import-transactions',
          options: {
            accountId: targetAccountId,
            filename,
            onImported: didChange => {
              onImported(didChange);
              void pairImportedAccount({
                hintId,
                accountId: targetAccountId,
                accounts,
                dispatch,
              });
            },
          },
        },
      }),
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (accountId) {
      startImport(accountId);
    }
  }

  return (
    <Modal name="import-account" containerProps={{ style: { width: 420 } }}>
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Import Transactions')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          {isMismatch ? (
            <View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                  color: theme.warningText,
                  marginBottom: 15,
                }}
              >
                <SvgExclamationOutline
                  width={16}
                  height={16}
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
                <Text style={{ lineHeight: 1.5 }}>
                  <Trans>
                    This file looks like it belongs to{' '}
                    <strong>
                      {{ matchedName: matched.name } as TransObjectLiteral}
                    </strong>
                    , but you started from{' '}
                    <strong>
                      {{ startedName: startedFrom.name } as TransObjectLiteral}
                    </strong>
                    .
                  </Trans>
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                <Button onPress={() => startImport(startedFrom.id)}>
                  <Trans>
                    Import to{' '}
                    {{ accountName: startedFrom.name } as TransObjectLiteral}{' '}
                    anyway
                  </Trans>
                </Button>
                <Button
                  variant="primary"
                  autoFocus
                  onPress={() => startImport(matched.id)}
                >
                  <Trans>
                    Import to{' '}
                    {{ accountName: matched.name } as TransObjectLiteral}
                  </Trans>
                </Button>
              </View>
            </View>
          ) : (
            <Form onSubmit={onSubmit}>
              <Paragraph style={{ lineHeight: 1.5 }}>
                {matched ? (
                  <Trans>
                    This file matches{' '}
                    <strong>
                      {{ accountName: matched.name } as TransObjectLiteral}
                    </strong>
                    . Choose a different account if that's not right.
                  </Trans>
                ) : (
                  <Trans>Which account is this file for?</Trans>
                )}
              </Paragraph>
              {suggested && accountId !== suggested.id && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ color: theme.pageTextSubdued }}>
                    <Trans>
                      This looks like{' '}
                      <strong>
                        {{ accountName: suggested.name } as TransObjectLiteral}
                      </strong>
                      .
                    </Trans>
                  </Text>
                  <Button
                    variant="bare"
                    onPress={() => setAccountId(suggested.id)}
                  >
                    <Trans>
                      Use{' '}
                      {{ accountName: suggested.name } as TransObjectLiteral}
                    </Trans>
                  </Button>
                </View>
              )}
              <View style={{ marginBottom: 15 }}>
                <AccountAutocomplete
                  includeClosedAccounts={false}
                  value={accountId}
                  inputProps={{
                    placeholder: t('Select account...'),
                    autoFocus: !matched,
                  }}
                  onSelect={id => setAccountId(id)}
                />
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  gap: 10,
                }}
              >
                <Button onPress={() => state.close()}>
                  <Trans>Cancel</Trans>
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  autoFocus={!!matched}
                  isDisabled={!accountId}
                >
                  <Trans>Continue</Trans>
                </Button>
              </View>
            </Form>
          )}
        </>
      )}
    </Modal>
  );
}
