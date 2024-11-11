import { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next'; // Import useTranslation from i18next
import { useLocation } from 'react-router-dom';

import * as Platform from 'loot-core/src/client/platform';

import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';

type KeyIconProps = {
  shortcut: string;
  style?: CSSProperties;
};

type GroupHeadingProps = {
  group: string;
};

type ShortcutProps = {
  shortcut: string;
  description: string;
  meta?: string;
  shift?: boolean;
  style?: CSSProperties;
};

function KeyIcon({ shortcut, style }: KeyIconProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        backgroundColor: '#fff',
        color: '#000',
        border: '1px solid #000',
        borderRadius: 8,
        minWidth: 30,
        minHeight: 30,
        filter: 'drop-shadow(1px 1px)',
        padding: 5,
        ...style,
      }}
    >
      {shortcut}
    </div>
  );
}

function GroupHeading({ group }: GroupHeadingProps) {
  return (
    <Text
      style={{
        fontWeight: 'bold',
        fontSize: 16,
        marginTop: 20,
        marginBottom: 10,
      }}
    >
      {group}:
    </Text>
  );
}

function Shortcut({
  shortcut,
  description,
  meta,
  shift,
  style,
}: ShortcutProps) {
  return (
    <div
      style={{
        display: 'flex',
        marginBottom: 5,
        marginLeft: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            marginRight: 10,
          }}
        >
          {shift && (
            <>
              <KeyIcon shortcut="Shift" />
              <Text
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  textAlign: 'center',
                  fontSize: 16,
                  paddingLeft: 2,
                  paddingRight: 2,
                }}
              >
                +
              </Text>
            </>
          )}
          {meta && (
            <>
              <KeyIcon shortcut={meta} />
              <Text
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  textAlign: 'center',
                  fontSize: 16,
                  paddingLeft: 2,
                  paddingRight: 2,
                }}
              >
                +
              </Text>
            </>
          )}
          <KeyIcon shortcut={shortcut} style={style} />
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flex: 1,
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          maxWidth: 300,
        }}
      >
        {description}
      </div>
    </div>
  );
}

export function KeyboardShortcutModal() {
  const location = useLocation();
  const { t } = useTranslation(); // Initialize useTranslation
  const onBudget = location.pathname.startsWith('/budget');
  const onAccounts = location.pathname.startsWith('/accounts');
  const ctrl = Platform.OS === 'mac' ? '⌘' : 'Ctrl';
  return (
    <Modal name="keyboard-shortcuts">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Keyboard Shortcuts')} // Translate title
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              flexDirection: 'row',
              fontSize: 13,
            }}
          >
            <View>
              <Shortcut shortcut="?" description={t('Open the help menu')} />
              <Shortcut
                shortcut="O"
                description={t('Close the current budget and open another')}
                meta={ctrl}
              />
              <Shortcut
                shortcut="P"
                description={t('Toggle the privacy filter')}
                meta={ctrl}
                shift={true}
              />
              {onBudget && (
                <Shortcut
                  shortcut="0"
                  description={t('View current month')}
                  style={{
                    fontVariantNumeric: 'slashed-zero',
                  }}
                />
              )}
              {onAccounts && (
                <>
                  <Shortcut
                    shortcut="Enter"
                    description={t('Move down when editing')}
                  />
                  <Shortcut
                    shortcut="Enter"
                    description={t('Move up when editing')}
                    shift={true}
                  />
                  <Shortcut
                    shortcut="I"
                    description={t('Import transactions')}
                    meta={ctrl}
                  />
                  <Shortcut
                    shortcut="B"
                    description={t('Bank sync')}
                    meta={ctrl}
                  />
                  <GroupHeading group={t('With transaction(s) selected')} />
                  <Shortcut
                    shortcut="F"
                    description={t('Filter to the selected transactions')}
                  />
                  <Shortcut
                    shortcut="D"
                    description={t('Delete selected transactions')}
                  />
                  <Shortcut
                    shortcut="A"
                    description={t('Set account for selected transactions')}
                  />
                  <Shortcut
                    shortcut="P"
                    description={t('Set payee for selected transactions')}
                  />
                  <Shortcut
                    shortcut="N"
                    description={t('Set notes for selected transactions')}
                  />
                  <Shortcut
                    shortcut="C"
                    description={t('Set category for selected transactions')}
                  />
                  <Shortcut
                    shortcut="L"
                    description={t('Toggle cleared for selected transactions')}
                  />
                  <Shortcut
                    shortcut="S"
                    description={t(
                      'Link or view schedule for selected transactions',
                    )}
                  />
                </>
              )}
            </View>
            <View
              style={{
                marginRight: 15,
              }}
            >
              <Shortcut
                shortcut="Z"
                description={t('Undo the last change')}
                meta={ctrl}
              />
              <Shortcut
                shortcut="Z"
                description={t('Redo the last undone change')}
                shift={true}
                meta={ctrl}
              />
              {onAccounts && (
                <>
                  <Shortcut
                    shortcut="Enter"
                    description={t('Move up when editing')}
                    shift={true}
                  />
                  <Shortcut
                    shortcut="Tab"
                    description={t('Move left when editing')}
                    shift={true}
                  />
                  {onBudget && (
                    <>
                      <Shortcut
                        shortcut="←"
                        description={t('View previous month')}
                      />
                      <Shortcut
                        shortcut="→"
                        description={t('View next month')}
                      />
                    </>
                  )}
                  {onAccounts && (
                    <>
                      <Shortcut
                        shortcut="A"
                        description={t('Select all transactions')}
                        meta={ctrl}
                      />
                      <Shortcut
                        shortcut="Tab"
                        description={t('Move right when editing')}
                      />
                      <Shortcut
                        shortcut="Tab"
                        description={t('Move left when editing')}
                        shift={true}
                      />
                      <Shortcut
                        shortcut="T"
                        description={t('Add a new transaction')}
                      />
                      <Shortcut
                        shortcut="F"
                        description={t('Filter transactions')}
                      />
                      <GroupHeading group={t('Select a transaction, then')} />
                      <Shortcut
                        shortcut="J"
                        description={t('Move to the next transaction down')}
                      />
                      <Shortcut
                        shortcut="K"
                        description={t('Move to the next transaction up')}
                      />
                      <Shortcut
                        shortcut="↑"
                        description={t(
                          'Move to the next transaction down and scroll',
                        )}
                      />
                      <Shortcut
                        shortcut="↓"
                        description={t(
                          'Move to the next transaction up and scroll',
                        )}
                      />
                      <Shortcut
                        shortcut="Space"
                        description={t(
                          'Toggle selection of current transaction',
                        )}
                      />
                      <Shortcut
                        shortcut="Space"
                        description={t(
                          'Toggle all transactions between current and most recently selected transaction',
                        )}
                        shift={true}
                      />
                    </>
                  )}
                </>
              )}
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
