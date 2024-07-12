import { useLocation } from 'react-router-dom';

import * as Platform from 'loot-core/src/client/platform';

import { Modal, type ModalProps } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';

type KeyboardShortcutsModalProps = {
  modalProps?: Partial<ModalProps>;
};

type KeyIconProps = {
  shortcut: string;
};

type GroupHeadingProps = {
  group: string;
};

type ShortcutProps = {
  shortcut: string;
  description: string;
  meta?: string;
  shift?: boolean;
};

function KeyIcon({ shortcut }: KeyIconProps) {
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
        minWidth: 35,
        minHeight: 35,
        filter: 'drop-shadow(1px 1px)',
        padding: 5,
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

function Shortcut({ shortcut, description, meta, shift }: ShortcutProps) {
  return (
    <div
      style={{
        display: 'flex',
        marginBottom: 10,
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
          <KeyIcon shortcut={shortcut} />
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

export function KeyboardShortcutModal({
  modalProps,
}: KeyboardShortcutsModalProps) {
  const location = useLocation();
  const onAccounts = location.pathname.startsWith('/accounts');
  const ctrl = Platform.OS === 'mac' ? '⌘' : 'Ctrl';
  return (
    <Modal title="Keyboard Shortcuts" {...modalProps}>
      <View
        style={{
          flexDirection: 'row',
        }}
      >
        <View>
          <Shortcut
            shortcut="O"
            description="Close the current budget and open another"
            meta={ctrl}
          />
          <Shortcut shortcut="?" description="Show this help dialog" />
          {onAccounts && (
            <>
              <Shortcut shortcut="Enter" description="Move down when editing" />
              <Shortcut shortcut="Tab" description="Move right when editing" />
              <GroupHeading group="Select a transaction, then" />
              <Shortcut
                shortcut="J"
                description="Move to the next transaction down"
              />
              <Shortcut
                shortcut="K"
                description="Move to the next transaction up"
              />
              <Shortcut
                shortcut="↑"
                description="Move to the next transaction down and scroll"
              />
              <Shortcut
                shortcut="↓"
                description="Move to the next transaction up and scroll"
              />
              <Shortcut
                shortcut="Space"
                description="Toggle selection of current transaction"
              />
              <Shortcut
                shortcut="Space"
                description="Toggle all transactions between current and most recently selected transaction"
                shift={true}
              />
            </>
          )}
        </View>
        <View
          style={{
            marginLeft: 20,
            marginRight: 20,
          }}
        >
          <Shortcut
            shortcut="Z"
            description="Undo the last change"
            meta={ctrl}
          />
          <Shortcut
            shortcut="Z"
            description="Redo the last undone change"
            shift={true}
            meta={ctrl}
          />
          {onAccounts && (
            <>
              <Shortcut
                shortcut="Enter"
                description="Move up when editing"
                shift={true}
              />
              <Shortcut
                shortcut="Tab"
                description="Move left when editing"
                shift={true}
              />
              <GroupHeading group="With transaction(s) selected" />
              <Shortcut
                shortcut="F"
                description="Filter to the selected transactions"
              />
              <Shortcut
                shortcut="D"
                description="Delete selected transactions"
              />
              <Shortcut
                shortcut="A"
                description="Set account for selected transactions"
              />
              <Shortcut
                shortcut="P"
                description="Set payee for selected transactions"
              />
              <Shortcut
                shortcut="N"
                description="Set notes for selected transactions"
              />
              <Shortcut
                shortcut="C"
                description="Set category for selected transactions"
              />
              <Shortcut
                shortcut="L"
                description="Toggle cleared for current transaction"
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
