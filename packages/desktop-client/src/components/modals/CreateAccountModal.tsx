// @ts-strict-ignore
import React, { useEffect, useRef, useState } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';

import { useAuth } from '../../auth/AuthProvider';
import { Permissions } from '../../auth/types';
import { authorizeBank } from '../../gocardless';
import { useActions } from '../../hooks/useActions';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useGoCardlessStatus } from '../../hooks/useGoCardlessStatus';
import { useSimpleFinStatus } from '../../hooks/useSimpleFinStatus';
import { type SyncServerStatus } from '../../hooks/useSyncServerStatus';
import { SvgDotsHorizontalTriple } from '../../icons/v1';
import { theme } from '../../style';
import { Warning } from '../alerts';
import { Button, ButtonWithLoading } from '../common/Button2';
import { Link } from '../common/Link';
import { Menu } from '../common/Menu';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';
import { Paragraph } from '../common/Paragraph';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';
import { useMultiuserEnabled } from '../ServerContext';
import { Tooltip } from '../tooltips';

type CreateAccountProps = {
  syncServerStatus: SyncServerStatus;
  upgradingAccountId?: string;
};

export function CreateAccountModal({
  syncServerStatus,
  upgradingAccountId,
}: CreateAccountProps) {
  const actions = useActions();
  const [isGoCardlessSetupComplete, setIsGoCardlessSetupComplete] =
    useState(null);
  const [isSimpleFinSetupComplete, setIsSimpleFinSetupComplete] =
    useState(null);
  const [menuGoCardlessOpen, setGoCardlessMenuOpen] = useState<boolean>(false);
  const triggerRef = useRef(null);
  const [menuSimplefinOpen, setSimplefinMenuOpen] = useState<boolean>(false);
  const { hasPermission } = useAuth();
  const multiuserEnabled = useMultiuserEnabled();

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

  const canSetSecrets =
    !multiuserEnabled || hasPermission(Permissions.ADMINISTRATOR);

  return (
    <Modal name="add-account">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={title}
            rightContent={<ModalCloseButton onClick={close} />}
          />
          <View style={{ maxWidth: 500, gap: 30, color: theme.pageText }}>
            {upgradingAccountId == null && (
              <View style={{ gap: 10 }}>
                <Button
                  variant="primary"
                  style={{
                    padding: '10px 0',
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                  onPress={onCreateLocalAccount}
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
                  {(canSetSecrets || isGoCardlessSetupComplete) && (
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
                            ? 'Link bank account with GoCardless'
                            : 'Set up GoCardless for bank sync'}
                        </ButtonWithLoading>
                        {isGoCardlessSetupComplete && canSetSecrets && (
                          <>
                            <Button
                              ref={triggerRef}
                              variant="bare"
                              onPress={() => setGoCardlessMenuOpen(true)}
                              aria-label="GoCardless menu"
                            >
                              <SvgDotsHorizontalTriple
                                width={15}
                                height={15}
                                style={{ transform: 'rotateZ(90deg)' }}
                              />
                            </Button>
                            {menuGoCardlessOpen && (
                              <Popover
                                triggerRef={triggerRef}
                                isOpen={menuGoCardlessOpen}
                                onOpenChange={() =>
                                  setGoCardlessMenuOpen(false)
                                }
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
                              </Popover>
                            )}
                          </>
                        )}
                      </View>
                      <Text style={{ lineHeight: '1.4em', fontSize: 15 }}>
                        <strong>
                          Link a <em>European</em> bank account
                        </strong>{' '}
                        to automatically download transactions. GoCardless
                        provides reliable, up-to-date information from hundreds
                        of banks.
                      </Text>
                    </>
                  )}
                  {(canSetSecrets || isSimpleFinSetupComplete) &&
                    simpleFinSyncFeatureFlag === true && (
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
                              ? 'Link bank account with SimpleFIN'
                              : 'Set up SimpleFIN for bank sync'}
                          </ButtonWithLoading>
                          {isSimpleFinSetupComplete && canSetSecrets && (
                            <>
                              <Button
                                ref={triggerRef}
                                variant="bare"
                                onPress={() => setSimplefinMenuOpen(true)}
                                aria-label="SimpleFIN menu"
                              >
                                <SvgDotsHorizontalTriple
                                  width={15}
                                  height={15}
                                  style={{ transform: 'rotateZ(90deg)' }}
                                />
                              </Button>
                              {menuSimplefinOpen && (
                                <Popover
                                  triggerRef={triggerRef}
                                  isOpen={menuSimplefinOpen}
                                  onOpenChange={() =>
                                    setSimplefinMenuOpen(false)
                                  }
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
                                </Popover>
                              )}
                            </>
                          )}
                        </View>
                        <Text style={{ lineHeight: '1.4em', fontSize: 15 }}>
                          <strong>
                            Link a <em>North American</em> bank account
                          </strong>{' '}
                          to automatically download transactions. SimpleFIN
                          provides reliable, up-to-date information from
                          hundreds of banks.
                        </Text>
                      </>
                    )}
                  {(!isGoCardlessSetupComplete ||
                    (simpleFinSyncFeatureFlag && !isSimpleFinSetupComplete)) &&
                    !canSetSecrets && (
                      <Warning>
                        You don&apos;t have the required permissions to set up
                        secrets. Please contact an Admin to configure{' '}
                        {[
                          isGoCardlessSetupComplete ? '' : 'GoCardless',
                          isSimpleFinSetupComplete ? '' : 'SimpleFin',
                        ]
                          .filter(Boolean) // Remove empty values
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
        </>
      )}
    </Modal>
  );
}
