import { useState, type CSSProperties } from 'react';
import {
  Collection,
  Header,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Menu,
  MenuItem,
} from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as Platform from 'loot-core/shared/platform';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { Search } from '@desktop-client/components/common/Search';

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
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}
    >
      <Text>{description}</Text>

      <View
        style={{
          flexDirection: 'row',
          gap: 4,
          alignItems: 'center',
        }}
      >
        {shift && (
          <>
            <KeyIcon shortcut="Shift" />
            <Text>+</Text>
          </>
        )}
        {meta && (
          <>
            <KeyIcon shortcut={meta} />
            <Text>+</Text>
          </>
        )}
        <KeyIcon shortcut={shortcut} style={style} />
      </View>
    </View>
  );
}

type Shortcut = {
  id: string;
  shortcut: string;
  description: string;
  meta?: string;
  shift?: boolean;
};

type ShortcutCategories = {
  id: string;
  name: string;
  items: Shortcut[];
};
export function KeyboardShortcutModal() {
  // const location = useLocation();
  const { t } = useTranslation();
  // const onBudget = location.pathname.startsWith('/budget');
  // const onAccounts = location.pathname.startsWith('/accounts');
  const ctrl = Platform.OS === 'mac' ? '⌘' : 'Ctrl';

  const [searchText, setSearchText] = useState('');

  const shortcuts: ShortcutCategories[] = [
    {
      name: t('General'),
      id: 'general',
      items: [
        {
          id: 'help',
          shortcut: '?',
          description: t('Open the help menu'),
        },
        {
          id: 'command-palette',
          shortcut: 'K',
          description: t('Open the Command Palette'),
          meta: ctrl,
        },
        {
          id: 'close-budget',
          shortcut: 'O',
          description: t('Close the current budget and open another'),
          meta: ctrl,
        },
        {
          id: 'toggle-privacy-filter',
          shortcut: 'P',
          description: t('Toggle the privacy filter'),
          meta: ctrl,
          shift: true,
        },
      ],
    },
    {
      id: 'account-page',
      name: t('Account page'),
      items: [],
    },
  ];

  const getFilteredShortcuts = (searchText: string) => {
    return shortcuts.map(section => ({
      ...section,
      items: section.items.filter(item => {
        const searchTextLower = searchText.toLowerCase();
        if (item.description.toLowerCase().includes(searchTextLower)) {
          return true;
        }

        return false;
      }),
    }));
  };

  const [filteredShortcuts, setFilteredShortcuts] = useState(shortcuts);

  return (
    <Modal name="keyboard-shortcuts">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Keyboard shortcuts')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              flexDirection: 'column',
              fontSize: 13,
            }}
          >
            <Search
              value={searchText}
              onChange={text => {
                setSearchText(text);
                setFilteredShortcuts(getFilteredShortcuts(text));
              }}
              placeholder={t('Search shortcuts')}
              width="100%"
              style={{
                backgroundColor: theme.tableBackground,
                borderColor: theme.formInputBorder,
              }}
            />
            <View
              style={{
                flexDirection: 'column',
                fontSize: 13,
              }}
            >
              <ListBox
                aria-label={t('Shortcuts list')}
                selectionMode="none"
                items={filteredShortcuts}
                renderEmptyState={() => (
                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: theme.mobilePageBackground,
                    }}
                  >
                    <Text style={{ fontSize: 15 }}>
                      <Trans>No matching shortcuts</Trans>
                    </Text>
                  </View>
                )}
              >
                {section => (
                  <ListBoxSection>
                    <Header>{section.name}</Header>

                    <Collection items={section.items} addIdAndValue>
                      {shortcut => (
                        <ListBoxItem
                          style={{
                            padding: '4px 0',
                            height: 60,
                            borderWidth: '0 0 1px 0',
                            borderColor: theme.tableBorder,
                            borderStyle: 'solid',
                            borderRadius: 0,
                            display: 'flex',
                            // width: '100%',
                            // alignItems: 'center',
                            // justifyContent: 'center',
                            // backgroundColor: theme.mobilePageBackground,
                          }}
                        >
                          <Shortcut
                            shortcut={shortcut.shortcut}
                            description={shortcut.description}
                            meta={shortcut.meta}
                            shift={shortcut.shift}
                          />
                        </ListBoxItem>
                      )}
                    </Collection>
                  </ListBoxSection>
                )}
              </ListBox>
              {/* <Shortcut shortcut="?" description={t('Open the help menu')} />
              <Shortcut
                shortcut="K"
                description={t('Open the Command Palette')}
                meta={ctrl}
              />
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
              /> */}
            </View>
          </View>
          {/* <View
            style={{
              flexDirection: 'row',
              fontSize: 13,
            }}
          > */}
          {/* <View>
              <Shortcut shortcut="?" description={t('Open the help menu')} />
              <Shortcut
                shortcut="K"
                description={t('Open the Command Palette')}
                meta={ctrl}
              />
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
                  <GroupHeading group={t('With transactions selected')} />
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
            </View> */}
          {/* <View
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
            </View> */}
          {/* </View> */}
        </>
      )}
    </Modal>
  );
}
