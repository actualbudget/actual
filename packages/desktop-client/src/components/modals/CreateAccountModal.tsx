import React, { useEffect, useState } from 'react';
import { DialogTrigger } from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/client/actions';
import { send } from 'loot-core/src/platform/client/fetch';

import { authorizeBank } from '../../gocardless';
import { useGoCardlessStatus } from '../../hooks/useGoCardlessStatus';
import { useSimpleFinStatus } from '../../hooks/useSimpleFinStatus';
import { useSyncServerStatus } from '../../hooks/useSyncServerStatus';
import { SvgDotsHorizontalTriple } from '../../icons/v1';
import { theme } from '../../style';
import { Button, ButtonWithLoading } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Link } from '../common/Link';
import { Menu } from '../common/Menu';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { View } from '../common/View';

export type NormalizedAccount = {
  id: string;
  name: string;
  institution: string;
  orgDomain: string;
  orgId: string;
  balance: number;
};

type CreateAccountProps = {
  upgradingAccountId?: string;
};

export function CreateAccountModal({ upgradingAccountId }: CreateAccountProps) {
  const { t } = useTranslation();
  const syncServerStatus = useSyncServerStatus();
  const dispatch = useDispatch();
  const [isGoCardlessSetupComplete, setIsGoCardlessSetupComplete] = useState<
    boolean | null
  >(null);
  const [isSimpleFinSetupComplete, setIsSimpleFinSetupComplete] = useState<
    boolean | null
  >(null);

  const onConnectGoCardless = () => {
    if (!isGoCardlessSetupComplete) {
      onGoCardlessInit();
      return;
    }

    if (upgradingAccountId == null) {
      authorizeBank(dispatch);
    } else {
      authorizeBank(dispatch, {
        upgradingAccountId,
      });
    }
  };

  const onConnectSimpleFin = async () => {
    if (!isSimpleFinSetupComplete) {
      onSimpleFinInit();
      return;
    }

    if (loadingSimpleFinAccounts) {
      return;
    }

    setLoadingSimpleFinAccounts(true);

    try {
      const results = await send('simplefin-accounts');
      if (results.error_code) {
        throw new Error(results.reason);
      }

      const newAccounts: NormalizedAccount[] = [];

      for (const oldAccount of results.accounts) {
        const newAccount: NormalizedAccount = {
          id: oldAccount.id,
          name: oldAccount.name,
          institution: oldAccount.org.name,
          orgDomain: oldAccount.org.domain,
          orgId: oldAccount.org.id,
          balance: oldAccount.balance,
        };

        newAccounts.push(newAccount);
      }

      dispatch(
        pushModal('select-linked-accounts', {
          accounts: newAccounts,
          syncSource: 'simpleFin',
        }),
      );
    } catch (err) {
      console.error(err);
      dispatch(
        pushModal('simplefin-init', {
          onSuccess: () => setIsSimpleFinSetupComplete(true),
        }),
      );
    }

    setLoadingSimpleFinAccounts(false);
  };

  const onGoCardlessInit = () => {
    dispatch(
      pushModal('gocardless-init', {
        onSuccess: () => setIsGoCardlessSetupComplete(true),
      }),
    );
  };

  const onSimpleFinInit = () => {
    dispatch(
      pushModal('simplefin-init', {
        onSuccess: () => setIsSimpleFinSetupComplete(true),
      }),
    );
  };

  const onGoCardlessReset = () => {
    send('secret-set', {
      name: 'gocardless_secretId',
      value: null,
    }).then(() => {
      send('secret-set', {
        name: 'gocardless_secretKey',
        value: null,
      }).then(() => {
        setIsGoCardlessSetupComplete(false);
      });
    });
  };

  const onSimpleFinReset = () => {
    send('secret-set', {
      name: 'simplefin_token',
      value: null,
    }).then(() => {
      send('secret-set', {
        name: 'simplefin_accessKey',
        value: null,
      }).then(() => {
        setIsSimpleFinSetupComplete(false);
      });
    });
  };

  const onCreateLocalAccount = () => {
    dispatch(pushModal('add-local-account'));
  };

  const { configuredGoCardless } = useGoCardlessStatus();
  useEffect(() => {
    setIsGoCardlessSetupComplete(configuredGoCardless);
  }, [configuredGoCardless]);

  const { configuredSimpleFin } = useSimpleFinStatus();
  useEffect(() => {
    setIsSimpleFinSetupComplete(configuredSimpleFin);
  }, [configuredSimpleFin]);

  let title = t('Add Account');
  const [loadingSimpleFinAccounts, setLoadingSimpleFinAccounts] =
    useState(false);

  if (upgradingAccountId != null) {
    title = t('Link Account');
  }

  return (
    <Modal name="add-account">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={title}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ maxWidth: 500, gap: 30, color: theme.pageText }}>
            {upgradingAccountId == null && (
              <View style={{ gap: 10 }}>
                <InitialFocus>
                  <Button
                    variant="primary"
                    style={{
                      padding: '10px 0',
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                    onPress={onCreateLocalAccount}
                  >
                    {t('Create local account')}
                  </Button>
                </InitialFocus>
                <View style={{ lineHeight: '1.4em', fontSize: 15 }}>
                  <Text>
                    <strong>{t('Create a local account')}</strong>{' '}
                    {t(
                      'if you want to add transactions manually. You can also',
                    )}{' '}
                    <Link
                      variant="external"
                      to="https://actualbudget.org/docs/transactions/importing"
                      linkColor="muted"
                    >
                      {t('import QIF/OFX/QFX files into a local account')}
                    </Link>
                    .
                  </Text>
                </View>
              </View>
            )}
            <View style={{ gap: 10 }}>
              {syncServerStatus === 'online' ? (
                <>
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    <ButtonWithLoading
                      isDisabled={syncServerStatus !== 'online'}
                      style={{
                        padding: '10px 0',
                        fontSize: 15,
                        fontWeight: 600,
                        flex: 1,
                      }}
                      onPress={onConnectGoCardless}
                    >
                      {isGoCardlessSetupComplete
                        ? t('Link bank account with GoCardless')
                        : t('Set up GoCardless for bank sync')}
                    </ButtonWithLoading>
                    {isGoCardlessSetupComplete && (
                      <DialogTrigger>
                        <Button
                          variant="bare"
                          aria-label={t('GoCardless menu')}
                        >
                          <SvgDotsHorizontalTriple
                            width={15}
                            height={15}
                            style={{ transform: 'rotateZ(90deg)' }}
                          />
                        </Button>

                        <Popover>
                          <Menu
                            onMenuSelect={item => {
                              if (item === 'reconfigure') {
                                onGoCardlessReset();
                              }
                            }}
                            items={[
                              {
                                name: 'reconfigure',
                                text: t('Reset GoCardless credentials'),
                              },
                            ]}
                          />
                        </Popover>
                      </DialogTrigger>
                    )}
                  </View>
                  <Text style={{ lineHeight: '1.4em', fontSize: 15 }}>
                    <strong>
                      {t('Link a')} <em>{t('European')}</em> {t('bank account')}
                    </strong>{' '}
                    {t(
                      'to automatically download transactions. GoCardless provides reliable, up-to-date information from hundreds of banks.',
                    )}
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      gap: 10,
                      marginTop: '18px',
                      alignItems: 'center',
                    }}
                  >
                    <ButtonWithLoading
                      isDisabled={syncServerStatus !== 'online'}
                      isLoading={loadingSimpleFinAccounts}
                      style={{
                        padding: '10px 0',
                        fontSize: 15,
                        fontWeight: 600,
                        flex: 1,
                      }}
                      onPress={onConnectSimpleFin}
                    >
                      {isSimpleFinSetupComplete
                        ? t('Link bank account with SimpleFIN')
                        : t('Set up SimpleFIN for bank sync')}
                    </ButtonWithLoading>
                    {isSimpleFinSetupComplete && (
                      <DialogTrigger>
                        <Button variant="bare" aria-label={t('SimpleFIN menu')}>
                          <SvgDotsHorizontalTriple
                            width={15}
                            height={15}
                            style={{ transform: 'rotateZ(90deg)' }}
                          />
                        </Button>
                        <Popover>
                          <Menu
                            onMenuSelect={item => {
                              if (item === 'reconfigure') {
                                onSimpleFinReset();
                              }
                            }}
                            items={[
                              {
                                name: 'reconfigure',
                                text: t('Reset SimpleFIN credentials'),
                              },
                            ]}
                          />
                        </Popover>
                      </DialogTrigger>
                    )}
                  </View>
                  <Text style={{ lineHeight: '1.4em', fontSize: 15 }}>
                    <strong>
                      {t('Link a')} <em>{t('North American')}</em>
                      {t(' bank account')}
                    </strong>{' '}
                    {t(
                      'to automatically download transactions. SimpleFIN provides reliable, up-to-date information from hundreds of banks.',
                    )}{' '}
                  </Text>
                </>
              ) : (
                <>
                  <Button
                    isDisabled
                    style={{
                      padding: '10px 0',
                      fontSize: 15,
                      fontWeight: 600,
                    }}
                  >
                    {t('Set up bank sync')}
                  </Button>
                  <Paragraph style={{ fontSize: 15 }}>
                    {t('Connect to an Actual server to set up')}{' '}
                    <Link
                      variant="external"
                      to="https://actualbudget.org/docs/advanced/bank-sync"
                      linkColor="muted"
                    >
                      {t('automatic syncing')}
                    </Link>
                    .
                  </Paragraph>
                </>
              )}
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
