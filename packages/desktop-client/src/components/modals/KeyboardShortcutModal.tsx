import {
  useState,
  type CSSProperties,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgArrowLeft } from '@actual-app/components/icons/v1';
import { styles as baseStyles } from '@actual-app/components/styles';
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

function ListItem({
  children,
  style,
  onClick,
}: {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  const clickStyles = onClick && {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: theme.tableRowBackgroundHover,
      color: theme.tableText,
    },
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        gap: 5,

        // Working on the below
        padding: 12,
        backgroundColor: theme.tableBackground,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderTopWidth: 1,
        borderColor: theme.tableBorder,
        height: 45,
        flexShrink: 0,
        '&:not(:first-child)': {
          borderTopWidth: 0,
        },
        '&:first-child': {
          borderTopLeftRadius: baseStyles.menuBorderRadius,
          borderTopRightRadius: baseStyles.menuBorderRadius,
        },
        '&:last-child': {
          borderBottomLeftRadius: baseStyles.menuBorderRadius,
          borderBottomRightRadius: baseStyles.menuBorderRadius,
        },
        ...clickStyles,
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </View>
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
    <ListItem>
      <Text>{description}</Text>

      <View
        style={{
          flexDirection: 'row',
          gap: 4,
          alignItems: 'center',
          flexShrink: 0,
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
    </ListItem>
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

  // Track the current view - either "sections", a specific section ID, or "search-results"
  const [currentView, setCurrentView] = useState<
    'sections' | 'search-results' | string
  >('sections');

  const shortcuts: ShortcutCategories[] = useMemo(
    () => [
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
          {
            id: 'undo-last-change',
            shortcut: 'Z',
            description: t('Undo the last change'),
            meta: ctrl,
          },
          {
            id: 'redo-last-change',
            shortcut: 'Z',
            description: t('Redo the last undone change'),
            shift: true,
            meta: ctrl,
          },
        ],
      },
      {
        id: 'budget-page',
        name: t('Budget page'),
        items: [
          {
            id: 'current-month',
            shortcut: '0',
            description: t('View current month'),
          },
          {
            id: 'View previous month',
            shortcut: '←',
            description: t('View previous month'),
          },
          {
            id: 'view-next-month',
            shortcut: '→',
            description: t('View next month'),
          },
        ],
      },
      {
        id: 'account-page',
        name: t('Account page'),
        items: [
          {
            id: 'move-down',
            shortcut: 'Enter',
            description: t('Move down when editing'),
          },
          {
            id: 'move-up',
            shortcut: 'Enter',
            shift: true,
            description: t('Move up when editing'),
          },
          {
            id: 'import-transactions',
            shortcut: 'I',
            meta: ctrl,
            description: t('Import transactions'),
          },
          {
            id: 'bank-sync',
            shortcut: 'B',
            meta: ctrl,
            description: t('Bank sync'),
          },
          {
            id: 'filter-to-selected-transactions',
            shortcut: 'F',
            description: t('Filter to the selected transactions'),
          },
          {
            id: 'delete-selected-transactions',
            shortcut: 'D',
            description: t('Delete the selected transactions'),
          },
          {
            id: 'set-account-for-selected-transactions',
            shortcut: 'A',
            description: t('Set account for selected transactions'),
          },
          {
            id: 'set-payee-for-selected-transactions',
            shortcut: 'P',
            description: t('Set payee for selected transactions'),
          },
          {
            id: 'set-notes-for-selected-transactions',
            shortcut: 'N',
            description: t('Set notes for selected transactions'),
          },
          {
            id: 'set-category-for-selected-transactions',
            shortcut: 'C',
            description: t('Set category for selected transactions'),
          },
          {
            id: 'toggle-cleared-for-selected-transactions',
            shortcut: 'L',
            description: t('Toggle cleared for selected transactions'),
          },
          {
            id: 'link-or-view-schedule-for-selected-transactions',
            shortcut: 'S',
            description: t('Link or view schedule for selected transactions'),
          },
          {
            id: 'select-all-transactions',
            shortcut: 'A',
            description: t('Select all transactions'),
            meta: ctrl,
          },
          {
            id: 'move-left-when-editing',
            shortcut: 'Tab',
            description: t('Move left when editing'),
            shift: true,
          },
          {
            id: 'move-right-when-editing',
            shortcut: 'Tab',
            description: t('Move right when editing'),
          },
          {
            id: 'add-new-transaction',
            shortcut: 'T',
            description: t('Add a new transaction'),
          },
          {
            id: 'filter-transactions',
            shortcut: 'F',
            description: t('Filter transactions'),
          },
          {
            id: 'move-next-transaction',
            shortcut: 'J',
            description: t('Move to the next transaction down'),
          },
          {
            id: 'move-previous-transaction',
            shortcut: 'K',
            description: t('Move to the next transaction up'),
          },
          {
            id: 'move-next-transaction-scroll',
            shortcut: '↑',
            description: t('Move to the next transaction down and scroll'),
          },
          {
            id: 'move-previous-transaction-scroll',
            shortcut: '↓',
            description: t('Move to the next transaction up and scroll'),
          },
          {
            id: 'toggle-selection-current-transaction',
            shortcut: 'Space',
            description: t('Toggle selection of current transaction'),
          },
          {
            id: 'toggle-selection-all-transactions',
            shortcut: 'Space',
            description: t(
              'Toggle transactions between current and most recently selected transaction',
            ),
            shift: true,
          },
        ],
      },
    ],
    [t, ctrl],
  );

  // Filter sections and their items based on search text
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

  // Get all matching shortcuts across all sections as a flat list
  const getAllMatchingShortcuts = useCallback(
    (searchText: string) => {
      if (!searchText) return [];

      const searchTextLower = searchText.toLowerCase();
      return shortcuts.flatMap(section =>
        section.items.filter(item =>
          item.description.toLowerCase().includes(searchTextLower),
        ),
      );
    },
    [shortcuts],
  );

  const [filteredShortcuts, setFilteredShortcuts] = useState(shortcuts);
  const allMatchingShortcuts = useMemo(
    () => getAllMatchingShortcuts(searchText),
    [getAllMatchingShortcuts, searchText],
  );

  // Get the current section being viewed (if any)
  const currentSection =
    currentView !== 'sections' && currentView !== 'search-results'
      ? filteredShortcuts.find(s => s.id === currentView)
      : null;

  return (
    <Modal name="keyboard-shortcuts" containerProps={{ style: { width: 700 } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={
              currentView === 'search-results'
                ? t('Search results')
                : currentSection
                  ? t('{{sectionName}} shortcuts', {
                      sectionName: currentSection.name,
                    })
                  : t('Keyboard shortcuts')
            }
            leftContent={
              currentView !== 'sections' ? (
                <Button
                  variant="bare"
                  onClick={() => {
                    setSearchText('');
                    setFilteredShortcuts(getFilteredShortcuts(''));
                    setCurrentView('sections');
                  }}
                  style={{ marginRight: 10, marginLeft: 15, zIndex: 3000 }}
                >
                  <SvgArrowLeft
                    width={10}
                    height={10}
                    style={{ marginRight: 5, color: 'currentColor' }}
                  />
                  <Trans>Back</Trans>
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

                // Switch to search results view when searching
                if (text) {
                  setCurrentView('search-results');
                } else if (currentView === 'search-results') {
                  // Return to section list when clearing search
                  setCurrentView('sections');
                }
              }}
              placeholder={t('Search shortcuts')}
              width="100%"
              style={{
                backgroundColor: theme.tableBackground,
                borderColor: theme.formInputBorder,
                marginBottom: 10,
              }}
            />

            <View
              style={{
                flexDirection: 'column',
                overflowY: 'auto',
                maxHeight: '50vh',
              }}
            >
              {/* Main view - List of sections */}
              {currentView === 'sections' &&
                (filteredShortcuts.length === 0 ? (
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
                    <ListItem
                      key={section.id}
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
                          width: '100%',
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
                    </ListItem>
                  ))
                ))}

              {/* Search results view - Shows all matching shortcuts */}
              {currentView === 'search-results' &&
                (allMatchingShortcuts.length === 0 ? (
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
                  allMatchingShortcuts.map(shortcut => (
                    <ShortcutListItem
                      key={shortcut.id}
                      shortcut={shortcut.shortcut}
                      description={shortcut.description}
                      meta={shortcut.meta}
                      shift={shortcut.shift}
                      style={shortcut.style}
                    />
                  ))
                ))}

              {/* Section detail view */}
              {currentView !== 'sections' &&
                currentView !== 'search-results' &&
                currentSection &&
                (currentSection.items.length === 0 ? (
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
                    <ShortcutListItem
                      key={shortcut.id}
                      shortcut={shortcut.shortcut}
                      description={shortcut.description}
                      meta={shortcut.meta}
                      shift={shortcut.shift}
                      style={shortcut.style}
                    />
                  ))
                ))}
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
