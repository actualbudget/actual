import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { AccountGroupEntity } from '@actual-app/core/types/models';

type AccountGroupPickerProps = {
  id?: string;
  groups: AccountGroupEntity[];
  onSelect: (groupId: AccountGroupEntity['id']) => void;
  onCreate: (name: string) => Promise<AccountGroupEntity['id']>;
  placeholder?: string;
};

export function AccountGroupPicker({
  id,
  groups,
  onSelect,
  onCreate,
  placeholder,
}: AccountGroupPickerProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const matches = groups.filter(group =>
    group.name.toLowerCase().includes(trimmed.toLowerCase()),
  );
  const exact = matches.find(
    group => group.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const showCreate = trimmed.length > 0 && !exact;
  type Item = { kind: 'group'; group: AccountGroupEntity } | { kind: 'create' };
  const items: Item[] = [
    ...matches.map(group => ({ kind: 'group', group }) satisfies Item),
    ...(showCreate ? [{ kind: 'create' } satisfies Item] : []),
  ];

  useEffect(() => {
    if (highlight >= items.length) setHighlight(Math.max(0, items.length - 1));
  }, [items.length, highlight]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const pick = async (item: Item) => {
    if (item.kind === 'group') {
      onSelect(item.group.id);
    } else {
      let newId;
      try {
        newId = await onCreate(trimmed);
      } catch {
        // Creation failures surface as a notification; keep the query so
        // the user can adjust it
        return;
      }
      onSelect(newId);
    }
    setQuery('');
    setOpen(false);
  };

  return (
    <View ref={containerRef}>
      <Input
        id={id}
        value={query}
        placeholder={placeholder ?? t('Type to search or create…')}
        onChangeValue={value => {
          setQuery(value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (!open) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight(h => Math.min(items.length - 1, h + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight(h => Math.max(0, h - 1));
          } else if (e.key === 'Enter' && items[highlight]) {
            e.preventDefault();
            void pick(items[highlight]);
          } else if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
          }
        }}
      />
      {open && items.length > 0 && (
        <View
          style={{
            marginTop: 2,
            backgroundColor: theme.menuBackground,
            border: `1px solid ${theme.menuBorder}`,
            borderRadius: 6,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {items.map((item, i) => {
            const active = i === highlight;
            const isCreate = item.kind === 'create';
            return (
              <View
                key={item.kind === 'group' ? item.group.id : '__create__'}
                onClick={() => void pick(item)}
                onMouseEnter={() => setHighlight(i)}
                style={{
                  padding: '8px 10px',
                  cursor: 'pointer',
                  backgroundColor: active
                    ? theme.menuAutoCompleteBackgroundHover
                    : 'transparent',
                  fontSize: 12,
                  fontWeight: isCreate ? 500 : undefined,
                  color: isCreate
                    ? active
                      ? theme.menuAutoCompleteTextHover
                      : theme.noticeTextMenu
                    : active
                      ? theme.menuAutoCompleteTextHover
                      : theme.menuItemText,
                }}
              >
                {item.kind === 'group'
                  ? item.group.name
                  : `+ ${t('Create "{{name}}"', { name: trimmed })}`}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
