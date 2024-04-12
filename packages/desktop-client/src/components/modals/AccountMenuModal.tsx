import React, { useState } from 'react';

import { useLiveQuery } from 'loot-core/src/client/query-hooks';
import { q } from 'loot-core/src/shared/query';
import { type AccountEntity } from 'loot-core/types/models';

import { useAccounts } from '../../hooks/useAccounts';
import { SvgClose, SvgDotsHorizontalTriple, SvgLockOpen } from '../../icons/v1';
import { SvgNotesPaper } from '../../icons/v2';
import { type CSSProperties, styles, theme } from '../../style';
import { Button } from '../common/Button';
import { Menu } from '../common/Menu';
import { Modal, ModalTitle } from '../common/Modal';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';
import { Notes } from '../Notes';
import { Tooltip } from '../tooltips';

type NoteEntity = {
  id: string;
  note: string;
};

type AccountMenuModalProps = {
  modalProps: CommonModalProps;
  accountId: string;
  onSave: (account: AccountEntity) => void;
  onCloseAccount: (accountId: string) => void;
  onReopenAccount: (accountId: string) => void;
  onEditNotes: (id: string) => void;
  onClose?: () => void;
};

export function AccountMenuModal({
  modalProps,
  accountId,
  onSave,
  onCloseAccount,
  onReopenAccount,
  onEditNotes,
  onClose,
}: AccountMenuModalProps) {
  const accounts = useAccounts();
  const account = accounts.find(c => c.id === accountId);
  const data = useLiveQuery(
    () => q('notes').filter({ id: account?.id }).select('*'),
    [account?.id],
  ) as NoteEntity[] | null;
  const originalNotes = data && data.length > 0 ? data[0].note : null;

  const _onClose = () => {
    modalProps?.onClose();
    onClose?.();
  };

  const onRename = (newName: string) => {
    if (!account) {
      return;
    }

    if (newName !== account.name) {
      onSave?.({
        ...account,
        name: newName,
      });
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
      title={
        <ModalTitle isEditable title={account.name} onTitleUpdate={onRename} />
      }
      showHeader
      focusAfterClose={false}
      {...modalProps}
      onClose={_onClose}
      padding={0}
      style={{
        flex: 1,
        height: '45vh',
        padding: '0 10px',
        borderRadius: '6px',
      }}
      leftHeaderContent={
        <AdditionalAccountMenu
          account={account}
          onClose={onCloseAccount}
          onReopen={onReopenAccount}
        />
      }
    >
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
            margin: '10px 0',
          }}
        >
          <Button style={buttonStyle} onClick={_onEditNotes}>
            <SvgNotesPaper width={20} height={20} style={{ paddingRight: 5 }} />
            Edit notes
          </Button>
        </View>
      </View>
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
  const [menuOpen, setMenuOpen] = useState(false);
  const itemStyle: CSSProperties = {
    ...styles.mediumText,
    height: styles.mobileMinHeight,
  };

  return (
    <View>
      <Button
        type="bare"
        aria-label="Menu"
        onClick={() => {
          setMenuOpen(true);
        }}
      >
        <SvgDotsHorizontalTriple
          width={17}
          height={17}
          style={{ color: 'currentColor' }}
        />
        {menuOpen && (
          <Tooltip
            position="bottom-left"
            style={{ padding: 0 }}
            onClose={() => {
              setMenuOpen(false);
            }}
          >
            <Menu
              getItemStyle={() => itemStyle}
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
          </Tooltip>
        )}
      </Button>
    </View>
  );
}
