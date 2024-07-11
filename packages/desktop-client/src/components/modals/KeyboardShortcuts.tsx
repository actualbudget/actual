import { Modal } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';

function KeyIcon(key) {
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

function GroupHeading(group) {
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

function Shortcut(key, description, meta?) {
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

export function KeyboardShortcuts({ modalProps }) {
  return (
    <Modal title="Keyboard Shortcuts" {...modalProps}>
      <View
        style={{
          flexDirection: 'row',
        }}
      >
        <View>
          {Shortcut('Enter', 'Move down when editing')}
          {Shortcut('Tab', 'Move right when editing')}
          {Shortcut('o', 'Close the current budget', 'Ctrl')}
          {GroupHeading('Select a transaction, then')}
          {Shortcut('j', 'Move to the next transaction down')}
          {Shortcut('k', 'Move to the next transaction up')}
          {Shortcut('↑', 'Move to the next transaction down and scroll')}
          {Shortcut('↓', 'Move to the next transaction up and scroll')}
          {Shortcut('Space', 'Toggle selection of current transaction')}
          {Shortcut(
            'Space',
            'Toggle all transactions between current and most recently selected transaction',
            'Shift',
          )}
        </View>
        <View
          style={{
            marginLeft: 20,
            marginRight: 20,
          }}
        >
          {Shortcut('Enter', 'Move up when editing', 'Shift')}
          {Shortcut('Tab', 'Move left when editing', 'Shift')}
          {Shortcut('?', 'Show this help dialog')}
          {GroupHeading('With transaction(s) selected')}
          {Shortcut('f', 'Filter to the selected transactions')}
          {Shortcut('d', 'Delete selected transactions')}
          {Shortcut('a', 'Set account for selected transactions')}
          {Shortcut('p', 'Set payee for selected transactions')}
          {Shortcut('n', 'Set notes for selected transactions')}
          {Shortcut('c', 'Set category for selected transactions')}
          {Shortcut('l', 'Toggle cleared for current transaction')}
        </View>
      </View>
    </Modal>
  );
}
