import React, { useEffect, useId, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type { FinTSBank } from '@actual-app/core/types/models';
import { css } from '@emotion/css';

type FinTSBankSearchProps = {
  id: string;
  value: string;
  onChangeValue: (value: string) => void;
  onSelectBank: (bank: FinTSBank) => void;
};

// Matches the server, which ignores shorter queries.
const MIN_QUERY_LENGTH = 2;
const SEARCH_DELAY_MS = 200;

/**
 * A bank code field that suggests banks while typing a bank code or a bank
 * name, from the FinTS bank list configured on the server.
 */
export function FinTSBankSearch({
  id,
  value,
  onChangeValue,
  onSelectBank,
}: FinTSBankSearchProps) {
  const { t } = useTranslation();
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [result, setResult] = useState<{
    query: string;
    banks: FinTSBank[];
  } | null>(null);

  const query = value.trim();
  const isSearchable = query.length >= MIN_QUERY_LENGTH;
  // While the next search runs, the previous results stay visible instead of
  // the list flickering on every keystroke.
  const banks = isSearchable && result ? result.banks : [];
  const isListOpen = isOpen && isSearchable && result != null;

  useEffect(() => {
    if (!isOpen || !isSearchable) {
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      const response = await send('fints-bank-search', { query });
      if (isCancelled) {
        return;
      }
      // A failed search (no connection, or an error from the server) shows
      // no suggestions instead of breaking the dialog.
      const banks =
        'banks' in response && Array.isArray(response.banks)
          ? response.banks
          : [];
      setResult({ query, banks });
      setHighlightedIndex(-1);
    }, SEARCH_DELAY_MS);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, isSearchable, query]);

  function select(bank: FinTSBank) {
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelectBank(bank);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!isListOpen) {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setHighlightedIndex(
        index => (index + step + banks.length) % Math.max(banks.length, 1),
      );
    } else if (event.key === 'Enter' && banks[highlightedIndex]) {
      event.preventDefault();
      select(banks[highlightedIndex]);
    } else if (event.key === 'Escape') {
      // Close only the suggestions, not the dialog around the field.
      event.stopPropagation();
      setIsOpen(false);
    }
  }

  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <View>
      <Input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isListOpen}
        aria-controls={listId}
        aria-activedescendant={
          isListOpen && highlightedIndex >= 0
            ? optionId(highlightedIndex)
            : undefined
        }
        autoComplete="off"
        placeholder={t('Bank name or bank code')}
        value={value}
        onChangeValue={text => {
          onChangeValue(text);
          setIsOpen(true);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setIsOpen(false)}
      />
      {isListOpen && (
        <View
          id={listId}
          role="listbox"
          aria-label={t('Matching banks')}
          style={{
            marginTop: 2,
            maxHeight: 240,
            overflowY: 'auto',
            borderRadius: 4,
            backgroundColor: theme.menuAutoCompleteBackground,
            color: theme.menuAutoCompleteText,
          }}
        >
          {banks.length === 0 ? (
            <Text style={{ padding: 8 }}>
              <Trans>No matching bank found.</Trans>
            </Text>
          ) : (
            banks.map((bank, index) => (
              <View
                key={bank.blz}
                id={optionId(index)}
                role="option"
                aria-selected={index === highlightedIndex}
                // Selecting on mouse down keeps the field from losing focus
                // and closing the list before the click arrives.
                onMouseDown={event => {
                  event.preventDefault();
                  select(bank);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={css({
                  // View is a flex column: without this, the options shrink
                  // to fit the list's maximum height and overlap.
                  flexShrink: 0,
                  padding: '5px 8px',
                  cursor: 'default',
                  backgroundColor:
                    index === highlightedIndex
                      ? theme.menuAutoCompleteBackgroundHover
                      : undefined,
                })}
              >
                <Text>{bank.name}</Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: theme.menuAutoCompleteTextHeader,
                  }}
                >
                  {bank.city ? `${bank.blz} · ${bank.city}` : bank.blz}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}
