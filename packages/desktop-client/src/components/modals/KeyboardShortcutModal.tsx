import { useState, type CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
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

type ShortcutListItemProps = {
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

function ShortcutListItem({
  shortcut,
  description,
  meta,
  shift,
  style,
}: ShortcutListItemProps) {
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
  style?: CSSProperties;
};

type ShortcutCategories = {
  id: string;
  name: string;
  items: Shortcut[];
};

export function KeyboardShortcutModal() {
  const { t } = useTranslation();
  const ctrl = Platform.OS === 'mac' ? '⌘' : 'Ctrl';
  const [searchText, setSearchText] = useState('');

  // Track the current view - either "sections" or a specific section ID
  const [currentView, setCurrentView] = useState<string>('sections');

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
      items: [
        // Add your account page shortcuts here
        {
          id: 'move-down',
          shortcut: 'Enter',
          description: t('Move down when editing'),
        },
      ],
    },
    // Add other sections as needed
  ];

  const getFilteredShortcuts = (searchText: string) => {
    return shortcuts
      .map(section => ({
        ...section,
        items: section.items.filter(item => {
          const searchTextLower = searchText.toLowerCase();
          return item.description.toLowerCase().includes(searchTextLower);
        }),
      }))
      .filter(section => section.items.length > 0 || !searchText);
  };

  const [filteredShortcuts, setFilteredShortcuts] = useState(shortcuts);

  // Get the current section being viewed (if any)
  const currentSection =
    currentView !== 'sections'
      ? filteredShortcuts.find(s => s.id === currentView)
      : null;

  return (
    <Modal name="keyboard-shortcuts">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={
              currentSection
                ? t('{{sectionName}} shortcuts', {
                    sectionName: currentSection.name,
                  })
                : t('Keyboard shortcuts')
            }
            leftContent={
              currentView !== 'sections' ? (
                <Button
                  variant="bare"
                  onClick={() => setCurrentView('sections')}
                  style={{ marginRight: 10, zIndex: 3000 }}
                >
                  ← <Trans>Back</Trans>
                </Button>
              ) : null
            }
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              flexDirection: 'column',
              fontSize: 13,
              padding: '0 16px 16px 16px',
            }}
          >
            <Search
              value={searchText}
              onChange={text => {
                setSearchText(text);
                setFilteredShortcuts(getFilteredShortcuts(text));

                // Return to section list when searching
                if (text && currentView !== 'sections') {
                  setCurrentView('sections');
                }
              }}
              placeholder={t('Search shortcuts')}
              width="100%"
              style={{
                backgroundColor: theme.tableBackground,
                borderColor: theme.formInputBorder,
                marginBottom: 16,
              }}
            />

            {/* Main view - List of sections */}
            {currentView === 'sections' && (
              <View>
                {filteredShortcuts.length === 0 ? (
                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 20,
                    }}
                  >
                    <Text style={{ fontSize: 15 }}>
                      <Trans>No matching shortcuts</Trans>
                    </Text>
                  </View>
                ) : (
                  filteredShortcuts.map(section => (
                    <View
                      key={section.id}
                      style={{
                        padding: 12,
                        backgroundColor: theme.tableBackground,
                        borderRadius: 6,
                        marginBottom: 8,
                        cursor: 'pointer',
                        borderWidth: 1,
                        borderColor: theme.tableBorder,
                        height: 40,
                        display: 'flex',
                        justifyContent: 'center',
                        ':hover': {
                          backgroundColor: theme.tableRowBackgroundHover,
                          color: theme.tableText,
                        },
                      }}
                      onClick={() => {
                        if (section.items.length > 0) {
                          setCurrentView(section.id);
                        }
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontWeight: 'bold' }}>
                          {section.name}
                        </Text>
                        <Text style={{ color: theme.pageTextLight }}>
                          {section.items.length}{' '}
                          {section.items.length === 1
                            ? t('shortcut')
                            : t('shortcuts')}{' '}
                          ›
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* Section detail view */}
            {currentView !== 'sections' && currentSection && (
              <View style={{ flexDirection: 'column' }}>
                {currentSection.items.length === 0 ? (
                  <View
                    style={{
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 20,
                    }}
                  >
                    <Text style={{ fontSize: 15 }}>
                      <Trans>No shortcuts in this section</Trans>
                    </Text>
                  </View>
                ) : (
                  currentSection.items.map(shortcut => (
                    <View
                      key={shortcut.id}
                      style={{
                        padding: 12,
                        backgroundColor: theme.tableBackground,
                        borderRadius: 6,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: theme.tableBorder,
                        height: 40,
                      }}
                    >
                      <ShortcutListItem
                        shortcut={shortcut.shortcut}
                        description={shortcut.description}
                        meta={shortcut.meta}
                        shift={shortcut.shift}
                        style={shortcut.style}
                      />
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        </>
      )}
    </Modal>
  );
}
