// @ts-strict-ignore
import React, { useEffect, useState } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

import { authorizeBank } from '../../gocardless';
import { useActions } from '../../hooks/useActions';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useGoCardlessStatus } from '../../hooks/useGoCardlessStatus';
import { useSimpleFinStatus } from '../../hooks/useSimpleFinStatus';
import { type SyncServerStatus } from '../../hooks/useSyncServerStatus';
import { SvgDotsHorizontalTriple } from '../../icons/v1';
import { theme } from '../../style';
import { Button, ButtonWithLoading } from '../common/Button';
import { Link } from '../common/Link';
import { Menu } from '../common/Menu';
import { Modal } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';
import { Tooltip } from '../tooltips';

type CreateAccountProps = {
  modalProps: CommonModalProps;
  syncServerStatus: SyncServerStatus;
  upgradingAccountId?: string;
};

export function CreateAccountModal({
  modalProps,
  syncServerStatus,
  upgradingAccountId,
}: CreateAccountProps) {
  const actions = useActions();
  const [isGoCardlessSetupComplete, setIsGoCardlessSetupComplete] =
    useState(null);
  const [isSimpleFinSetupComplete, setIsSimpleFinSetupComplete] =
    useState(null);
  const [menuGoCardlessOpen, setGoCardlessMenuOpen] = useState<boolean>(false);
  const [menuSimplefinOpen, setSimplefinMenuOpen] = useState<boolean>(false);

  const onConnectGoCardless = () => {
    if (!isGoCardlessSetupComplete) {
      onGoCardlessInit();
      return;
    }

    if (upgradingAccountId == null) {
      authorizeBank(actions.pushModal);
    } else {
      authorizeBank(actions.pushModal, {
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

      const newAccounts = [];

      type NormalizedAccount = {
        account_id: string;
        name: string;
        institution: string;
        orgDomain: string;
        orgId: string;
        balance: number;
      };

      for (const oldAccount of results.accounts) {
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

      actions.pushModal('select-linked-accounts', {
        accounts: newAccounts,
        syncSource: 'simpleFin',
      });
    } catch (err) {
      console.error(err);
      actions.pushModal('simplefin-init', {
        onSuccess: () => setIsSimpleFinSetupComplete(true),
      });
    }

    setLoadingSimpleFinAccounts(false);
  };

  const onGoCardlessInit = () => {
    actions.pushModal('gocardless-init', {
      onSuccess: () => setIsGoCardlessSetupComplete(true),
    });
  };

  const onSimpleFinInit = () => {
    actions.pushModal('simplefin-init', {
      onSuccess: () => setIsSimpleFinSetupComplete(true),
    });
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
        setGoCardlessMenuOpen(false);
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
        setSimplefinMenuOpen(false);
      });
    });
  };

  const onCreateLocalAccount = () => {
    actions.pushModal('add-local-account');
  };

  const { configuredGoCardless } = useGoCardlessStatus();
  useEffect(() => {
    setIsGoCardlessSetupComplete(configuredGoCardless);
  }, [configuredGoCardless]);

  const { configuredSimpleFin } = useSimpleFinStatus();
  useEffect(() => {
    setIsSimpleFinSetupComplete(configuredSimpleFin);
  }, [configuredSimpleFin]);

  let title = 'Add Account';
  const [loadingSimpleFinAccounts, setLoadingSimpleFinAccounts] =
    useState(false);

  if (upgradingAccountId != null) {
    title = 'Link Account';
  }

  const simpleFinSyncFeatureFlag = useFeatureFlag('simpleFinSync');

  return (
    <Modal title={title} {...modalProps}>
      {() => (
        <View style={{ maxWidth: 500, gap: 30, color: theme.pageText }}>
          {upgradingAccountId == null && (
            <View style={{ gap: 10 }}>
              <Button
                type="primary"
                style={{
                  padding: '10px 0',
                  fontSize: 15,
                  fontWeight: 600,
                }}
                onClick={onCreateLocalAccount}
              >
                Create local account
              </Button>
              <View style={{ lineHeight: '1.4em', fontSize: 15 }}>
                <Text>
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
                    disabled={syncServerStatus !== 'online'}
                    style={{
                      padding: '10px 0',
                      fontSize: 15,
                      fontWeight: 600,
                      flex: 1,
                    }}
                    onClick={onConnectGoCardless}
                  >
                    {isGoCardlessSetupComplete
                      ? 'Link bank account with GoCardless'
                      : 'Set up GoCardless for bank sync'}
                  </ButtonWithLoading>
                  {isGoCardlessSetupComplete && (
                    <Button
                      type="bare"
                      onClick={() => setGoCardlessMenuOpen(true)}
                      aria-label="Menu"
                    >
                      <SvgDotsHorizontalTriple
                        width={15}
                        height={15}
                        style={{ transform: 'rotateZ(90deg)' }}
                      />
                      {menuGoCardlessOpen && (
                        <Tooltip
                          position="bottom-right"
                          width={200}
                          style={{ padding: 0 }}
                          onClose={() => setGoCardlessMenuOpen(false)}
                        >
                          <Menu
                            onMenuSelect={item => {
                              if (item === 'reconfigure') {
                                onGoCardlessReset();
                              }
                            }}
                            items={[
                              {
                                name: 'reconfigure',
                                text: 'Reset GoCardless credentials',
                              },
                            ]}
                          />
                        </Tooltip>
                      )}
                    </Button>
                  )}
                </View>
                <Text style={{ lineHeight: '1.4em', fontSize: 15 }}>
                  <strong>
                    Link a <em>European</em> bank account
                  </strong>{' '}
                  to automatically download transactions. GoCardless provides
                  reliable, up-to-date information from hundreds of banks.
                </Text>
                {simpleFinSyncFeatureFlag === true && (
                  <>
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 10,
                        marginTop: '18px',
                        alignItems: 'center',
                      }}
                    >
                      <ButtonWithLoading
                        disabled={syncServerStatus !== 'online'}
                        loading={loadingSimpleFinAccounts}
                        style={{
                          padding: '10px 0',
                          fontSize: 15,
                          fontWeight: 600,
                          flex: 1,
                        }}
                        onClick={onConnectSimpleFin}
                      >
                        {isSimpleFinSetupComplete
                          ? 'Link bank account with SimpleFIN'
                          : 'Set up SimpleFIN for bank sync'}
                      </ButtonWithLoading>
                      {isSimpleFinSetupComplete && (
                        <Button
                          type="bare"
                          onClick={() => setSimplefinMenuOpen(true)}
                          aria-label="Menu"
                        >
                          <SvgDotsHorizontalTriple
                            width={15}
                            height={15}
                            style={{ transform: 'rotateZ(90deg)' }}
                          />
                          {menuSimplefinOpen && (
                            <Tooltip
                              position="bottom-right"
                              width={200}
                              style={{ padding: 0 }}
                              onClose={() => setSimplefinMenuOpen(false)}
                            >
                              <Menu
                                onMenuSelect={item => {
                                  if (item === 'reconfigure') {
                                    onSimpleFinReset();
                                  }
                                }}
                                items={[
                                  {
                                    name: 'reconfigure',
                                    text: 'Reset SimpleFIN credentials',
                                  },
                                ]}
                              />
                            </Tooltip>
                          )}
                        </Button>
                      )}
                    </View>
                    <Text style={{ lineHeight: '1.4em', fontSize: 15 }}>
                      <strong>
                        Link a <em>North American</em> bank account
                      </strong>{' '}
                      to automatically download transactions. SimpleFIN provides
                      reliable, up-to-date information from hundreds of banks.
                    </Text>
                  </>
                )}
              </>
            ) : (
              <>
                <Button
                  disabled
                  style={{
                    padding: '10px 0',
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  Set up bank sync
                </Button>
                <Paragraph style={{ fontSize: 15 }}>
                  Connect to an Actual server to set up{' '}
                  <Link
                    variant="external"
                    to="https://actualbudget.org/docs/advanced/bank-sync"
                    linkColor="muted"
                  >
                    automatic syncing
                  </Link>
                  .
                </Paragraph>
              </>
            )}
          </View>
        </View>
      )}
    </Modal>
  );
}
