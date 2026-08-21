import { useEffect, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { SvgArrowLeft } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { Command } from 'cmdk';

import { Highlight, KeyChip, ShortcutHint } from './primitives';
import {
  actionFooterClassName,
  actionHeaderClassName,
  actionHeaderIconClassName,
  actionItemClassName,
  destructiveActionClassName,
  paletteGroupClassName,
} from './styles';
import type {
  ActionItem,
  ActionPageHeader,
  ActionSection,
  ShortcutHint as ShortcutHintType,
} from './types';

export type ActionPageProps = Readonly<{
  header: ActionPageHeader;
  sections: readonly ActionSection[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelectAction: (action: ActionItem) => void;
  onBack?: () => void;
  primaryShortcutHint?: ShortcutHintType;
  secondaryShortcutHint?: ShortcutHintType;
  searchPlaceholder?: string;
  listClassName: string;
}>;

function Header({
  header,
  onBack,
}: {
  header: ActionPageHeader;
  onBack?: () => void;
}) {
  const { t } = useTranslation();
  const Leading = header.Icon;
  return (
    <View className={actionHeaderClassName} role="heading" aria-level={2}>
      {onBack != null && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t('Back')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
            border: 0,
            background: 'transparent',
            color: 'var(--color-pageTextSubdued)',
            cursor: 'pointer',
          }}
        >
          <SvgArrowLeft aria-hidden width={16} height={16} />
        </button>
      )}
      {(header.leading != null || Leading != null) && (
        <View className={actionHeaderIconClassName} aria-hidden>
          {header.leading ?? (Leading ? <Leading /> : null)}
        </View>
      )}
      <View style={{ minWidth: 0, flex: 1 }}>
        <Text
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 650,
          }}
        >
          {header.name}
        </Text>
        <Text
          style={{
            display: 'block',
            marginTop: 1,
            fontSize: 11.5,
            color: 'var(--color-pageTextSubdued)',
          }}
        >
          {header.typeLabel}
        </Text>
      </View>
      {header.secondary != null && (
        <Text style={{ color: 'var(--color-pageTextSubdued)', flexShrink: 0 }}>
          {header.secondary}
        </Text>
      )}
    </View>
  );
}

function ActionRow({
  action,
  value,
  query,
  onSelect,
}: {
  action: ActionItem;
  value: string;
  query: string;
  onSelect: (action: ActionItem) => void;
}) {
  const Icon = action.Icon;
  return (
    <Command.Item
      value={value}
      aria-label={action.name}
      onSelect={() => onSelect(action)}
      className={`${actionItemClassName} ${action.destructive ? destructiveActionClassName : ''}`}
    >
      {action.leading ?? (Icon ? <Icon /> : null)}
      <View style={{ minWidth: 0, flex: 1 }}>
        <Text
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <Highlight text={action.name} query={query} />
        </Text>
        {action.description != null && (
          <Text
            style={{
              display: 'block',
              marginTop: 2,
              fontSize: 11.5,
              color: 'var(--color-pageTextSubdued)',
            }}
          >
            {action.description}
          </Text>
        )}
      </View>
      {action.shortcut?.map(key => (
        <KeyChip key={key}>{key}</KeyChip>
      ))}
    </Command.Item>
  );
}

export function ActionPage({
  header,
  sections,
  query,
  onQueryChange,
  onSelectAction,
  onBack,
  primaryShortcutHint,
  secondaryShortcutHint,
  searchPlaceholder,
  listClassName,
}: ActionPageProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const visibleSections = sections.filter(
    (section): section is ActionSection => section != null,
  );
  const queryLower = query.trim().toLowerCase();
  const filteredSections = visibleSections
    .map(section => ({
      ...section,
      items: section.items.filter(action =>
        action.name.toLowerCase().includes(queryLower),
      ),
    }))
    .filter(section => section.items.length > 0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <View
      style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        flexDirection: 'column',
      }}
    >
      <Header header={header} onBack={onBack} />
      <Command.Input
        ref={inputRef}
        autoFocus
        value={query}
        onValueChange={onQueryChange}
        placeholder={searchPlaceholder ?? t('Search actions...')}
        aria-label={t('Search actions')}
        onKeyDown={event => {
          if (event.key === 'Backspace' && query === '' && onBack != null) {
            event.preventDefault();
            onBack();
          }
        }}
        style={{
          padding: '11px 12px 8px',
          border: 0,
          outline: 0,
          width: '100%',
        }}
      />
      <Command.List className={listClassName} label={t('Available actions')}>
        {filteredSections.map(section => (
          <Command.Group
            key={section.key}
            heading={section.heading}
            className={paletteGroupClassName}
          >
            {section.items.map(action => (
              <ActionRow
                key={action.id}
                action={action}
                value={`action:${section.key}:${action.id}`}
                query={query}
                onSelect={onSelectAction}
              />
            ))}
          </Command.Group>
        ))}
        {filteredSections.length === 0 && (
          <Command.Empty
            style={{
              padding: '18px 12px',
              color: 'var(--color-pageTextSubdued)',
            }}
          >
            <Trans>No actions found</Trans>
          </Command.Empty>
        )}
      </Command.List>
      {(primaryShortcutHint != null || secondaryShortcutHint != null) && (
        <View
          className={actionFooterClassName}
          aria-label={t('Keyboard shortcuts')}
        >
          {primaryShortcutHint != null && (
            <ShortcutHint {...primaryShortcutHint} />
          )}
          {secondaryShortcutHint != null && (
            <ShortcutHint {...secondaryShortcutHint} />
          )}
        </View>
      )}
    </View>
  );
}
