import { Modal, type ModalProps } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';

type KeyboardShortcutsModalProps = {
  modalProps?: Partial<ModalProps>;
};

type GroupHeadingProps = {
  group: string;
};

type ShortcutProps = {
  key: string;
  description: string;
  meta?: string;
};

function KeyIcon(key: string) {
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
      {key}
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

function Shortcut({ key, description, meta }: ShortcutProps) {
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
              {KeyIcon(meta)}
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
          {KeyIcon(key)}
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

export function KeyboardShortcuts({ modalProps }: KeyboardShortcutsModalProps) {
  return (
    <Modal title="Keyboard Shortcuts" {...modalProps}>
      <View
        style={{
          flexDirection: 'row',
        }}
      >
        <View>
          <Shortcut key="Enter" description="Move down when editing" />
          <Shortcut key="Tab" description="Move right when editing" />
          <Shortcut
            key="o"
            description="Close the current budget"
            meta="Ctrl"
          />
          <GroupHeading group="Select a transaction, then" />
          <Shortcut key="j" description="Move to the next transaction down" />
          <Shortcut key="k" description="Move to the next transaction up" />
          <Shortcut
            key="↑"
            description="Move to the next transaction down and scroll"
          />
          <Shortcut
            key="↓"
            description="Move to the next transaction up and scroll"
          />
          <Shortcut
            key="Space"
            description="Toggle selection of current transaction"
          />
          <Shortcut
            key="Space"
            description="Toggle all transactions between current and most recently selected transaction"
            meta="Shift"
          />
        </View>
        <View
          style={{
            marginLeft: 20,
            marginRight: 20,
          }}
        >
          <Shortcut
            key="Enter"
            description="Move up when editing"
            meta="Shift"
          />
          <Shortcut
            key="Tab"
            description="Move left when editing"
            meta="Shift"
          />
          <Shortcut key="?" description="Show this help dialog" />
          <GroupHeading group="With transaction(s) selected" />
          <Shortcut key="f" description="Filter to the selected transactions" />
          <Shortcut key="d" description="Delete selected transactions" />
          <Shortcut
            key="a"
            description="Set account for selected transactions"
          />
          <Shortcut key="p" description="Set payee for selected transactions" />
          <Shortcut key="n" description="Set notes for selected transactions" />
          <Shortcut
            key="c"
            description="Set category for selected transactions"
          />
          <Shortcut
            key="l"
            description="Toggle cleared for current transaction"
          />
        </View>
      </View>
    </Modal>
  );
}
