import {
  type ComponentProps,
  type CSSProperties,
  Fragment,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';
import { type AccountEntity } from 'loot-core/types/models';

import { useAccount } from '../../hooks/useAccount';
import { useAccounts } from '../../hooks/useAccounts';
import { useNotes } from '../../hooks/useNotes';
import { SvgClose, SvgDotsHorizontalTriple, SvgLockOpen } from '../../icons/v1';
import { SvgNotesPaper } from '../../icons/v2';
import { styles, theme } from '../../style';
import { Button } from '../common/Button2';
import { Menu } from '../common/Menu';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal';
import { Popover } from '../common/Popover';
import { View } from '../common/View';
import { Notes } from '../Notes';
import { validateAccountName } from '../util/accountValidation';

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
}: AccountMenuModalProps) {
  const { t } = useTranslation();
  const account = useAccount(accountId);
  const accounts = useAccounts();
  const originalNotes = useNotes(`account-${accountId}`);
  const [accountNameError, setAccountNameError] = useState('');
  const [currentAccountName, setCurrentAccountName] = useState(
    account?.name || t('New Account'),
  );

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
      {({ state: { close } }) => (
        <>
          <ModalHeader
            leftContent={
              <AdditionalAccountMenu
                account={account}
                onClose={onCloseAccount}
                onReopen={onReopenAccount}
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
            rightContent={<ModalCloseButton onPress={close} />}
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
                    : 'No notes'
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
                {t('Edit notes')}
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
};

function AdditionalAccountMenu({
  account,
  onClose,
  onReopen,
}: AdditionalAccountMenuProps) {
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

  return (
    <View>
      <Button
        ref={triggerRef}
        variant="bare"
        aria-label="Menu"
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
              account.closed
                ? {
                    name: 'reopen',
                    text: 'Reopen account',
                    icon: SvgLockOpen,
                    iconSize: 15,
                  }
                : {
                    name: 'close',
                    text: 'Close account',
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
                default:
                  throw new Error(`Unrecognized menu option: ${name}`);
              }
            }}
          />
        </Popover>
      </Button>
    </View>
  );
}
