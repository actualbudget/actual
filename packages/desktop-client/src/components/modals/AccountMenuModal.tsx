import { Fragment, useEffect, useRef, useState } from 'react';
import type { ComponentProps, CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgClose,
  SvgDotsHorizontalTriple,
  SvgLockOpen,
} from '@actual-app/components/icons/v1';
import { SvgNotesPaper } from '@actual-app/components/icons/v2';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Select } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { currencies } from '@actual-app/core/shared/currencies';
import { currentDay } from '@actual-app/core/shared/months';
import { amountToInteger, toRelaxedNumber } from '@actual-app/core/shared/util';
import type { AccountEntity } from '@actual-app/core/types/models';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import { Checkbox } from '#components/forms';
import { Notes } from '#components/Notes';
import { validateAccountName } from '#components/util/accountValidation';
import { useAccount } from '#hooks/useAccount';
import { useAccounts } from '#hooks/useAccounts';
import { useNotes } from '#hooks/useNotes';
import { useSyncedPref } from '#hooks/useSyncedPref';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import {
  getMissingExchangeRate,
  openMissingExchangeRateModal,
} from '#util/missingExchangeRate';

type AccountMenuModalProps = Extract<
  ModalType,
  { name: 'account-menu' }
>['options'];

export function AccountMenuModal({
  accountId,
  onSave,
  onCloseAccount,
  onReopenAccount,
  onEditNotes,
  onClose,
  onToggleRunningBalance,
  onToggleReconciled,
}: AccountMenuModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const account = useAccount(accountId);
  const { data: accounts = [] } = useAccounts();
  const [defaultCurrencyCode] = useSyncedPref('defaultCurrencyCode');
  const originalNotes = useNotes(`account-${accountId}`);
  const [accountNameError, setAccountNameError] = useState('');
  const [currentAccountName, setCurrentAccountName] = useState(
    account?.name || t('New Account'),
  );
  const [targetCurrency, setTargetCurrency] = useState(
    account?.currency || defaultCurrencyCode || 'USD',
  );
  const [conversionMode, setConversionMode] = useState<
    'reinterpret-as-native' | 'preserve-base-history'
  >('preserve-base-history');
  const [includeReconciled, setIncludeReconciled] = useState(false);
  const [conversionPreview, setConversionPreview] = useState<{
    transactionCount: number;
    firstDate: string | null;
    lastDate: string | null;
    missingRates: Array<{
      fromCurrency: string;
      toCurrency: string;
      date: string;
    }>;
  } | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [fxAdjustmentDate, setFxAdjustmentDate] = useState(currentDay());
  const [fxStatementBalance, setFxStatementBalance] = useState('');
  const [isCreatingFxAdjustment, setIsCreatingFxAdjustment] = useState(false);

  useEffect(() => {
    setTargetCurrency(account?.currency || defaultCurrencyCode || 'USD');
  }, [account?.currency, defaultCurrencyCode]);

  const onRename = (newName: string) => {
    newName = newName.trim();
    if (!account) {
      return;
    }
    if (!newName) {
      setCurrentAccountName(t('Account'));
    } else {
      setCurrentAccountName(newName);
    }

    if (newName !== account.name) {
      const renameAccountError = validateAccountName(
        newName,
        accountId,
        accounts,
      );
      if (renameAccountError) {
        setAccountNameError(renameAccountError);
      } else {
        setAccountNameError('');
        onSave?.({
          ...account,
          name: newName,
        });
      }
    }
  };

  const _onEditNotes = () => {
    if (!account) {
      return;
    }

    onEditNotes?.(account.id);
  };

  const buttonStyle: CSSProperties = {
    ...styles.mediumText,
    height: styles.mobileMinHeight,
    color: theme.formLabelText,
    // Adjust based on desired number of buttons per row.
    flexBasis: '100%',
  };

  if (!account) {
    return null;
  }

  const currencyOptions: [string, string][] = currencies
    .filter(currency => currency.code !== '')
    .map(currency => [currency.code, `${currency.code} - ${currency.name}`]);

  const previewCurrencyConversion = async () => {
    const preview = await send('account-currency-conversion-preview', {
      accountId,
      targetCurrency,
    });
    setConversionPreview(preview);
    return preview;
  };

  const convertCurrency = async () => {
    setIsConverting(true);
    try {
      const preview = conversionPreview ?? (await previewCurrencyConversion());
      if (preview.missingRates.length > 0) {
        openMissingExchangeRateModal({
          dispatch,
          t,
          missingRate: preview.missingRates[0],
          onSaved: async () => {
            await previewCurrencyConversion();
          },
        });
        return;
      }

      await send('account-currency-convert', {
        accountId,
        targetCurrency,
        mode: conversionMode,
        includeReconciled,
      });
      dispatch(
        addNotification({
          notification: {
            type: 'message',
            message: t('Account currency converted successfully.'),
          },
        }),
      );
    } catch (error) {
      const missingRate = getMissingExchangeRate(error);
      if (missingRate) {
        openMissingExchangeRateModal({
          dispatch,
          t,
          missingRate,
          onSaved: convertCurrency,
        });
        return;
      }

      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('There was an error converting the account currency.'),
            pre: error instanceof Error ? error.message : undefined,
          },
        }),
      );
    } finally {
      setIsConverting(false);
    }
  };

  const createFxAdjustment = async () => {
    setIsCreatingFxAdjustment(true);
    try {
      await send('account-fx-adjustment', {
        accountId,
        date: fxAdjustmentDate,
        statementBalance: amountToInteger(toRelaxedNumber(fxStatementBalance)),
      });
      setFxStatementBalance('');
      dispatch(
        addNotification({
          notification: {
            type: 'message',
            message: t('FX adjustment created successfully.'),
          },
        }),
      );
    } catch (error) {
      const missingRate = getMissingExchangeRate(error);
      if (missingRate) {
        openMissingExchangeRateModal({
          dispatch,
          t,
          missingRate,
          onSaved: createFxAdjustment,
        });
        return;
      }

      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('There was an error creating the FX adjustment.'),
            pre: error instanceof Error ? error.message : undefined,
          },
        }),
      );
    } finally {
      setIsCreatingFxAdjustment(false);
    }
  };

  return (
    <Modal
      name="account-menu"
      onClose={onClose}
      containerProps={{
        style: {
          height: '45vh',
        },
      }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            leftContent={
              <AdditionalAccountMenu
                account={account}
                onClose={onCloseAccount}
                onReopen={onReopenAccount}
                onToggleRunningBalance={onToggleRunningBalance}
                onToggleReconciled={onToggleReconciled}
              />
            }
            title={
              <Fragment>
                <ModalTitle
                  isEditable
                  title={currentAccountName}
                  onTitleUpdate={onRename}
                />
                {accountNameError && (
                  <View style={{ color: theme.warningText }}>
                    {accountNameError}
                  </View>
                )}
              </Fragment>
            }
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View
            style={{
              flex: 1,
              flexDirection: 'column',
            }}
          >
            <View
              style={{
                overflowY: 'auto',
                flex: 1,
              }}
            >
              <Notes
                notes={
                  originalNotes && originalNotes.length > 0
                    ? originalNotes
                    : t('No notes')
                }
                editable={false}
                focused={false}
                getStyle={() => ({
                  borderRadius: 6,
                  ...((!originalNotes || originalNotes.length === 0) && {
                    justifySelf: 'center',
                    alignSelf: 'center',
                    color: theme.pageTextSubdued,
                  }),
                })}
              />
              <View style={{ marginTop: 12, gap: 8 }}>
                <Text style={{ fontWeight: 600 }}>
                  <Trans>Currency conversion</Trans>
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Select
                    value={targetCurrency}
                    onChange={value => {
                      setTargetCurrency(value);
                      setConversionPreview(null);
                    }}
                    options={currencyOptions}
                    style={{ flex: 1 }}
                  />
                  <Select
                    value={conversionMode}
                    onChange={value => {
                      setConversionMode(
                        value as
                          | 'reinterpret-as-native'
                          | 'preserve-base-history',
                      );
                      setConversionPreview(null);
                    }}
                    options={[
                      ['preserve-base-history', t('Preserve base history')],
                      ['reinterpret-as-native', t('Reinterpret as native')],
                    ]}
                    style={{ flex: 1 }}
                  />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Checkbox
                    id="include-reconciled-currency-conversion"
                    checked={includeReconciled}
                    onChange={() => setIncludeReconciled(!includeReconciled)}
                  />
                  <label
                    htmlFor="include-reconciled-currency-conversion"
                    style={{ marginLeft: 6 }}
                  >
                    <Trans>Include reconciled transactions</Trans>
                  </label>
                </View>
                {conversionPreview && (
                  <Text>
                    {t(
                      '{{count}} transactions from {{firstDate}} to {{lastDate}}. {{missingCount}} missing rates.',
                      {
                        count: conversionPreview.transactionCount,
                        firstDate: conversionPreview.firstDate || t('none'),
                        lastDate: conversionPreview.lastDate || t('none'),
                        missingCount: conversionPreview.missingRates.length,
                      },
                    )}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button onPress={previewCurrencyConversion}>
                    <Trans>Preview conversion</Trans>
                  </Button>
                  <Button
                    variant="primary"
                    isDisabled={isConverting}
                    onPress={convertCurrency}
                  >
                    <Trans>Convert currency</Trans>
                  </Button>
                </View>
              </View>
              <View style={{ marginTop: 16, gap: 8 }}>
                <Text style={{ fontWeight: 600 }}>
                  <Trans>FX balance adjustment</Trans>
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Input
                    value={fxAdjustmentDate}
                    onChangeValue={setFxAdjustmentDate}
                    style={{ flex: 1 }}
                  />
                  <Input
                    inputMode="decimal"
                    value={fxStatementBalance}
                    onChangeValue={setFxStatementBalance}
                    style={{ flex: 1 }}
                  />
                  <Button
                    variant="primary"
                    isDisabled={
                      isCreatingFxAdjustment || fxStatementBalance.trim() === ''
                    }
                    onPress={createFxAdjustment}
                  >
                    <Trans>Create adjustment</Trans>
                  </Button>
                </View>
              </View>
            </View>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignContent: 'space-between',
                paddingTop: 10,
              }}
            >
              <Button style={buttonStyle} onPress={_onEditNotes}>
                <SvgNotesPaper
                  width={20}
                  height={20}
                  style={{ paddingRight: 5 }}
                />
                <Trans>Edit notes</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}

type AdditionalAccountMenuProps = {
  account: AccountEntity;
  onClose?: (accountId: string) => void;
  onReopen?: (accountId: string) => void;
  onToggleRunningBalance?: () => void;
  onToggleReconciled?: () => void;
};

function AdditionalAccountMenu({
  account,
  onClose,
  onReopen,
  onToggleRunningBalance,
  onToggleReconciled,
}: AdditionalAccountMenuProps) {
  const { t } = useTranslation();
  const triggerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const itemStyle: CSSProperties = {
    ...styles.mediumText,
    height: styles.mobileMinHeight,
  };

  const getItemStyle: ComponentProps<typeof Menu>['getItemStyle'] = item => ({
    ...itemStyle,
    ...(item.name === 'close' && { color: theme.errorTextMenu }),
  });
  const [showBalances] = useSyncedPref(`show-balances-${account.id}`);
  const [hideReconciled] = useSyncedPref(`hide-reconciled-${account.id}`);

  return (
    <View>
      <Button
        ref={triggerRef}
        variant="bare"
        aria-label={t('Menu')}
        onPress={() => {
          setMenuOpen(true);
        }}
      >
        <SvgDotsHorizontalTriple
          width={17}
          height={17}
          style={{ color: 'currentColor' }}
        />
        <Popover
          triggerRef={triggerRef}
          isOpen={menuOpen}
          placement="bottom start"
          onOpenChange={() => setMenuOpen(false)}
        >
          <Menu
            getItemStyle={getItemStyle}
            items={[
              {
                name: 'balance',
                text:
                  showBalances === 'true'
                    ? t('Hide running balance')
                    : t('Show running balance'),
              },
              {
                name: 'toggle-reconciled',
                text:
                  hideReconciled !== 'true'
                    ? t('Hide reconciled transactions')
                    : t('Show reconciled transactions'),
              },
              account.closed
                ? {
                    name: 'reopen',
                    text: t('Reopen account'),
                    icon: SvgLockOpen,
                    iconSize: 15,
                  }
                : {
                    name: 'close',
                    text: t('Close account'),
                    icon: SvgClose,
                    iconSize: 15,
                  },
            ]}
            onMenuSelect={name => {
              setMenuOpen(false);
              switch (name) {
                case 'close':
                  onClose?.(account.id);
                  break;
                case 'reopen':
                  onReopen?.(account.id);
                  break;
                case 'balance':
                  onToggleRunningBalance?.();
                  break;
                case 'toggle-reconciled':
                  onToggleReconciled?.();
                  break;
                default:
                  throw new Error(`Unrecognized menu option: ${String(name)}`);
              }
            }}
          />
        </Popover>
      </Button>
    </View>
  );
}
