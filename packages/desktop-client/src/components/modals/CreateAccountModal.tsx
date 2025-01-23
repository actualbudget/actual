import React, { useEffect, useState } from 'react';
import { DialogTrigger } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { pushModal } from 'loot-core/client/actions';
import { send } from 'loot-core/src/platform/client/fetch';

import { useAuth } from '../../auth/AuthProvider';
import { Permissions } from '../../auth/types';
import { authorizeBank } from '../../gocardless';
import { useGoCardlessStatus } from '../../hooks/useGoCardlessStatus';
import { useSimpleFinStatus } from '../../hooks/useSimpleFinStatus';
import { useSyncServerStatus } from '../../hooks/useSyncServerStatus';
import { SvgDotsHorizontalTriple } from '../../icons/v1';
import { useDispatch } from '../../redux';
import { theme } from '../../style';
import { Warning } from '../alerts';
import { Button, ButtonWithLoading } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Link } from '../common/Link';
import { Menu } from '../common/Menu';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { useMultiuserEnabled } from '../ServerContext';

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
  const { hasPermission } = useAuth();
  const multiuserEnabled = useMultiuserEnabled();

  const onConnectGoCardless = () => {
    if (!isGoCardlessSetupComplete) {
      onGoCardlessInit();
      return;
    }

    if (upgradingAccountId == null) {
      authorizeBank(dispatch);
    } else {
      authorizeBank(dispatch);
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

      const newAccounts = [];

      type NormalizedAccount = {
        account_id: string;
        name: string;
        institution: string;
        orgDomain: string;
        orgId: string;
        balance: number;
      };

      for (const oldAccount of results.accounts ?? []) {
        const newAccount: NormalizedAccount = {
          account_id: oldAccount.id,
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

  let title = t('Add account');
  const [loadingSimpleFinAccounts, setLoadingSimpleFinAccounts] =
    useState(false);

  if (upgradingAccountId != null) {
    title = t('Link account');
  }

  const canSetSecrets =
    !multiuserEnabled || hasPermission(Permissions.ADMINISTRATOR);

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
                    {t('Create a local account')}
                  </Button>
                </InitialFocus>
                <View style={{ lineHeight: '1.4em', fontSize: 15 }}>
                  <Text>
                    <Trans>
                      <strong>Create a local account</strong> if you want to add
                      transactions manually. You can also{' '}
                      <Link
                        variant="external"
                        to="https://actualbudget.org/docs/transactions/importing"
                        linkColor="muted"
                      >
                        import QIF/OFX/QFX files into a local account
                      </Link>
                      .
                    </Trans>
                  </Text>
                </View>
              </View>
            )}
            <View style={{ gap: 10 }}>
              {syncServerStatus === 'online' ? (
                <>
                  {canSetSecrets && (
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
                        <Trans>
                          <strong>
                            Link a <em>European</em> bank account
                          </strong>{' '}
                          to automatically download transactions.
                        </Trans>
                        <Trans>
                          GoCardless provides reliable, up-to-date information
                          from hundreds of banks.
                        </Trans>
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
                            <Button
                              variant="bare"
                              aria-label={t('SimpleFIN menu')}
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
                        <Trans>
                          <strong>
                            Link a <em>North American</em> bank account
                          </strong>{' '}
                          to automatically download transactions.
                        </Trans>
                        <Trans>
                          SimpleFIN provides reliable, up-to-date information
                          from hundreds of banks.
                        </Trans>
                      </Text>
                    </>
                  )}
                  {(!isGoCardlessSetupComplete || !isSimpleFinSetupComplete) &&
                    !canSetSecrets && (
                      <Warning>
                        <Trans>
                          You don&apos;t have the required permissions to set up
                          secrets. Please contact an Admin to configure
                        </Trans>{' '}
                        {[
                          isGoCardlessSetupComplete ? '' : 'GoCardless',
                          isSimpleFinSetupComplete ? '' : 'SimpleFin',
                        ]
                          .filter(Boolean)
                          .join(' or ')}
                        .
                      </Warning>
                    )}
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
                    <Trans>Set up bank sync</Trans>
                  </Button>
                  <Paragraph style={{ fontSize: 15 }}>
                    <Trans>
                      Connect to an Actual server to set up{' '}
                      <Link
                        variant="external"
                        to="https://actualbudget.org/docs/advanced/bank-sync"
                        linkColor="muted"
                      >
                        automatic syncing
                      </Link>
                      .
                    </Trans>
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
