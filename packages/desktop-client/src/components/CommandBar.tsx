'use client';

import { useEffect, useState } from 'react';

import { Command } from 'cmdk';

import { useAccounts } from '../hooks/useAccounts';
import { useNavigate } from '../hooks/useNavigate';

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const allAccounts = useAccounts();
  const navigate = useNavigate();

  const accounts = allAccounts.filter(acc => !acc.closed);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(open => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const handleAccountSelect = (accountId: string) => {
    navigate(`/accounts/${accountId}`);
    setOpen(false);
  };

  const filteredAccounts = accounts.filter(acc =>
    acc.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      aria-label="Command Menu"
      shouldFilter={false}
      style={{
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
      }}
    >
      <Command.Input
        placeholder="Search accounts..."
        value={search}
        onValueChange={setSearch}
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: '1rem',
          border: 'none',
          borderBottom: '1px solid var(--color-tableBorderSeparator)',
          backgroundColor: 'transparent',
          color: 'var(--color-pageText)',
          outline: 'none',
        }}
      />
      <Command.List
        style={{
          maxHeight: '300px',
          overflowY: 'auto',
          padding: '8px 0',
        }}
      >
        <Command.Empty
          style={{
            padding: '16px',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: 'var(--color-pageTextSubdued)',
          }}
        >
          No results found.
        </Command.Empty>

        {filteredAccounts.length > 0 && (
          <Command.Group
            heading="Accounts"
            style={{
              padding: '0 8px',
            }}
          >
            {filteredAccounts.map(account => (
              <Command.Item
                key={account.id}
                onSelect={() => handleAccountSelect(account.id)}
                value={account.name}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  borderRadius: '4px',
                  margin: '0 8px',
                }}
              >
                {account.name}
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
