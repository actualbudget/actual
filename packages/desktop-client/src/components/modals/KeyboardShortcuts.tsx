import { Modal, type ModalProps } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';

type KeyboardShortcutsModalProps = {
  onAccounts: boolean;
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

function Shortcut({ shortcut, description, meta }: ShortcutProps) {
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

export function KeyboardShortcuts({ onAccounts, modalProps }: KeyboardShortcutsModalProps) {
  return (
    <Modal title="Keyboard Shortcuts" {...modalProps}>
      <View
        style={{
          flexDirection: 'row',
        }}
      >
        <View>
          <Shortcut
            shortcut="o"
            description="Close the current budget"
            meta="Ctrl"
          />
          <Shortcut shortcut="?" description="Show this help dialog" />
          {onAccounts && (
            <>
              <Shortcut shortcut="Enter" description="Move down when editing" />
              <Shortcut shortcut="Tab" description="Move right when editing" />
              <GroupHeading group="Select a transaction, then" />
              <Shortcut
                shortcut="j"
                description="Move to the next transaction down"
              />
              <Shortcut
                shortcut="k"
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
                meta="Shift"
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
          <Shortcut shortcut="z" description="Undo the last change" meta="Ctrl" />
          <Shortcut shortcut="y" description="Redo the last undone change" meta="Ctrl" />
          {onAccounts && (
            <>
              <Shortcut
                shortcut="Enter"
                description="Move up when editing"
                meta="Shift"
              />
              <Shortcut
                shortcut="Tab"
                description="Move left when editing"
                meta="Shift"
              />
              <GroupHeading group="With transaction(s) selected" />
              <Shortcut
                shortcut="f"
                description="Filter to the selected transactions"
              />
              <Shortcut shortcut="d" description="Delete selected transactions" />
              <Shortcut
                shortcut="a"
                description="Set account for selected transactions"
              />
              <Shortcut
                shortcut="p"
                description="Set payee for selected transactions"
              />
              <Shortcut
                shortcut="n"
                description="Set notes for selected transactions"
              />
              <Shortcut
                shortcut="c"
                description="Set category for selected transactions"
              />
              <Shortcut
                shortcut="l"
                description="Toggle cleared for current transaction"
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
