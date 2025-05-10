/* eslint-disable rulesdir/typography */

import { useCallback, useEffect, useState } from 'react';

import { css } from '@emotion/css';
import { Command } from 'cmdk';

import { useReports } from 'loot-core/client/data-hooks/reports';

import { useAccounts } from '../hooks/useAccounts';
import { useMetadataPref } from '../hooks/useMetadataPref';
import { useNavigate } from '../hooks/useNavigate';

type SearchableItem = {
  id: string;
  name: string;
};

type SearchSection = {
  key: string;
  heading: string;
  items: ReadonlyArray<SearchableItem>;
  onSelect: (item: SearchableItem) => void;
};

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [budgetName] = useMetadataPref('budgetName');

  const allAccounts = useAccounts();
  const { data: reportsData, isLoading: isReportsLoading } = useReports();
  useEffect(
    () => console.log('reports', reportsData, isReportsLoading),
    [reportsData, isReportsLoading],
  );

  const accounts = allAccounts.filter(acc => !acc.closed);
  const reports = reportsData || [];

  const openEventListener = useCallback((e: KeyboardEvent) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', openEventListener);
    return () => document.removeEventListener('keydown', openEventListener);
  }, [openEventListener]);

  const handleNavigate = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const sections: SearchSection[] = [
    {
      key: 'accounts',
      heading: 'Accounts',
      items: accounts,
      onSelect: (item: SearchableItem) =>
        handleNavigate(`/accounts/${item.id}`),
    },
    {
      key: 'reports',
      heading: 'Reports',
      items: reports,
      onSelect: (item: SearchableItem) => handleNavigate(`/reports/${item.id}`),
    },
    // Future sections can be added here
  ];

  let hasResults = false;

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
        zIndex: 1001,
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
        })}
      >
        {sections.map(section => {
          const filteredItems = section.items.filter(item =>
            item.name.toLowerCase().includes(search.toLowerCase()),
          );

          if (filteredItems.length > 0) {
            hasResults = true;
            return (
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
                {filteredItems.map(item => (
                  <Command.Item
                    key={item.id}
                    onSelect={() => section.onSelect(item)}
                    value={item.name}
                    className={css({
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      borderRadius: '4px',
                      margin: '0 8px',
                      "&:hover, &[data-selected='true']": {
                        backgroundColor: 'var(--color-menuItemBackgroundHover)',
                        color: 'var(--color-menuItemTextHover)',
                      },
                    })}
                  >
                    {item.name}
                  </Command.Item>
                ))}
              </Command.Group>
            );
          }
          return null;
        })}
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
