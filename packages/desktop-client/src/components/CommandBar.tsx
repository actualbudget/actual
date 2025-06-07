/* eslint-disable rulesdir/typography */

import {
  type ComponentType,
  type SVGProps,
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  SvgCog,
  SvgPiggyBank,
  SvgReports,
  SvgStoreFront,
  SvgTuning,
  SvgWallet,
} from '@actual-app/components/icons/v1';
import {
  SvgCalendar3,
  SvgNotesPaperText,
} from '@actual-app/components/icons/v2';
import { css } from '@emotion/css';
import { Command } from 'cmdk';

import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useMetadataPref } from '@desktop-client/hooks/useMetadataPref';
import { useModalState } from '@desktop-client/hooks/useModalState';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useReports } from '@desktop-client/hooks/useReports';

type SearchableItem = {
  id: string;
  name: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

type SearchSection = {
  key: string;
  heading: string;
  items: Readonly<SearchableItem[]>;
  onSelect: (item: Pick<SearchableItem, 'id'>) => void;
};

const navigationItems: Readonly<(SearchableItem & { path: string })[]> = [
  { id: 'budget', name: 'Budget', path: '/budget', Icon: SvgWallet },
  { id: 'reports-nav', name: 'Reports', path: '/reports', Icon: SvgReports },
  {
    id: 'schedules',
    name: 'Schedules',
    path: '/schedules',
    Icon: SvgCalendar3,
  },
  { id: 'payees', name: 'Payees', path: '/payees', Icon: SvgStoreFront },
  { id: 'rules', name: 'Rules', path: '/rules', Icon: SvgTuning },
  { id: 'settings', name: 'Settings', path: '/settings', Icon: SvgCog },
];

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [budgetName] = useMetadataPref('budgetName');
  const { modalStack } = useModalState();

  // Reset search when closing the command bar
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const allAccounts = useAccounts();
  const { data: customReports } = useReports();

  const accounts = allAccounts.filter(acc => !acc.closed);

  const openEventListener = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        // Do not open CommandBar if a modal is already open
        if (modalStack.length > 0) return;
        setOpen(true);
      }
    },
    [modalStack.length],
  );

  useEffect(() => {
    document.addEventListener('keydown', openEventListener);
    return () => document.removeEventListener('keydown', openEventListener);
  }, [openEventListener]);

  const handleNavigate = useCallback(
    (path: string) => {
      setOpen(false);
      navigate(path);
    },
    [navigate],
  );

  const sections: SearchSection[] = [
    {
      key: 'navigation',
      heading: 'Navigation',
      items: navigationItems.map(({ id, name, Icon }) => ({
        id,
        name,
        Icon,
      })),
      onSelect: ({ id }) => {
        const item = navigationItems.find(item => item.id === id);
        if (!!item) handleNavigate(item.path);
      },
    },
    {
      key: 'accounts',
      heading: 'Accounts',
      items: accounts.map(account => ({
        ...account,
        Icon: SvgPiggyBank,
      })),
      onSelect: ({ id }) => handleNavigate(`/accounts/${id}`),
    },
    {
      key: 'reports-custom',
      heading: 'Custom Reports',
      items: customReports.map(report => ({
        ...report,
        Icon: SvgNotesPaperText,
      })),
      onSelect: ({ id }) => handleNavigate(`/reports/custom/${id}`),
    },
  ];

  const searchLower = search.toLowerCase();
  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.name.toLowerCase().includes(searchLower),
    ),
  }));
  const hasResults = filteredSections.some(section => !!section.items.length);

  return (
    <Command.Dialog
      vimBindings={true}
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      aria-label="Command Menu"
      shouldFilter={false}
      className={css({
        position: 'fixed',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -30%)',
        width: '90%',
        maxWidth: '600px',
        backgroundColor: 'var(--color-modalBackground)',
        border: '1px solid var(--color-modalBorder)',
        color: 'var(--color-pageText)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        zIndex: 3001,
      })}
    >
      <Command.Input
        placeholder={`Search ${budgetName}...`}
        value={search}
        onValueChange={setSearch}
        className={css({
          width: '100%',
          padding: '12px 16px',
          fontSize: '1rem',
          border: 'none',
          borderBottom: '1px solid var(--color-tableBorderSeparator)',
          backgroundColor: 'transparent',
          color: 'var(--color-pageText)',
          outline: 'none',
          '&::placeholder': {
            color: 'var(--color-pageTextSubdued)',
          },
        })}
      />
      <Command.List
        className={css({
          maxHeight: '300px',
          overflowY: 'auto',
          padding: '8px 0',
          // Hide the scrollbar
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          // Ensure content is still scrollable
          '-ms-overflow-style': 'none',
        })}
      >
        {filteredSections.map(
          section =>
            !!section.items.length && (
              <Command.Group
                key={section.key}
                heading={section.heading}
                className={css({
                  padding: '0 8px',
                  '& [cmdk-group-heading]': {
                    padding: '8px 8px 4px',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: 'var(--color-pageTextSubdued)',
                    textTransform: 'uppercase',
                  },
                })}
              >
                {section.items.map(({ id, name, Icon }) => (
                  <Command.Item
                    key={id}
                    onSelect={() => section.onSelect({ id })}
                    value={name}
                    className={css({
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      borderRadius: '4px',
                      margin: '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      // Avoid showing mouse hover styles when using keyboard navigation
                      '[data-cmdk-list]:not([data-cmdk-list-nav-active]) &:hover':
                        {
                          backgroundColor:
                            'var(--color-menuItemBackgroundHover)',
                          color: 'var(--color-menuItemTextHover)',
                        },
                      "&[data-selected='true']": {
                        backgroundColor: 'var(--color-menuItemBackgroundHover)',
                        color: 'var(--color-menuItemTextHover)',
                      },
                    })}
                  >
                    <Icon width={16} height={16} />
                    {name}
                  </Command.Item>
                ))}
              </Command.Group>
            ),
        )}

        {!hasResults && (
          <Command.Empty
            className={css({
              padding: '16px',
              textAlign: 'center',
              fontSize: '0.9rem',
              color: 'var(--color-pageTextSubdued)',
            })}
          >
            No results found.
          </Command.Empty>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
