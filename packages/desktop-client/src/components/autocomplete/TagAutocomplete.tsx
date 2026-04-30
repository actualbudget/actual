import {
  type CSSProperties,
  type FocusEventHandler,
  type KeyboardEvent,
  type KeyboardEventHandler,
} from 'react';
import { useEffect, useRef, useState } from 'react';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import { useTags } from '#hooks/useTags';
import { NotesTagFormatter } from '#notes/NotesTagFormatter';

import { Autocomplete } from './Autocomplete';

export type TagAutocompleteProps = {
  value: string;
  inputValue: string;
  setInputValue: (v: string) => void;
  inputStyle: CSSProperties;
  onUpdate: (v: string) => void;
  onBlur: FocusEventHandler;
  onKeyDown: KeyboardEventHandler;
};

type TagOption = {
  id: string;
  name: string;
  color: string | null | undefined;
};

export function TagAutocomplete({
  value,
  inputValue,
  setInputValue,
  onBlur,
  inputStyle,
  onUpdate,
  onKeyDown,
}: TagAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  useEffect(() => {
    inputRef.current?.setSelectionRange(cursorPosition, cursorPosition);
  }, [cursorPosition, setCursorPosition]);

  const tagQuery = useTags();
  const tagOptions: TagOption[] =
    tagQuery.data?.map(tag => ({
      id: tag.tag,
      name: '#' + tag.tag,
      color: tag.color,
    })) ?? [];

  function onSelect(
    optionId: string,
    value: string,
    e?: KeyboardEvent<HTMLInputElement>,
  ) {
    const [start, end] = getCurrentWordRange(value, cursorPosition);
    const option = tagOptions.find(o => o.id === optionId);
    if (option) {
      const newValue =
        value.slice(0, start) + option.name + ' ' + value.slice(end);
      setInputValue(newValue);
      setTimeout(() => setCursorPosition(start + option.name.length + 1));

      // only stop event propagation (i.e. table navigation) when we want to do
      // autocomplete things. If we don't choose an option, then we want to treat
      // this as a regular input field and do table navigation.
      e?.stopPropagation();
    } else {
      onUpdate(value);
    }
  }

  function onKeyUp(e: KeyboardEvent<HTMLInputElement>) {
    setCursorPosition(e.currentTarget.selectionStart ?? 0);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const highlightedEntries = document.querySelectorAll(
      'div[data-tag-highlighted=true]',
    );

    if (e.key === 'Escape') {
      // reset to initial value
      setInputValue(value);
    }
    if (e.key === 'Tab' && highlightedEntries.length) {
      const selectedId =
        highlightedEntries.item(0).getAttribute('data-tag-option-id') ?? '';
      e.preventDefault();
      e.stopPropagation();
      onSelect(selectedId, inputValue, e);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      // set to current value. For some reason this is
      // is not getting caught by the onBlur handler
      // likely because of Autocomplete complexity
      onUpdate(inputValue);
    }
    onKeyDown(e);
  }

  return (
    <Autocomplete
      strict={false}
      value={inputValue}
      embedded={false}
      getHighlightedIndex={() => 0}
      clearOnBlur={false}
      closeOnBlur
      openOnFocus={false}
      onSelect={onSelect}
      inputProps={{
        ref: inputRef,
        onFocus: e => setTimeout(() => e.target.select()),
        onBlur,
        onKeyUp,
        onKeyDownCapture: handleKeyDown,
        style: inputStyle,
        value: inputValue,
        onChange: v => setInputValue(v.target.value),
      }}
      suggestions={tagOptions}
      renderItems={(items, getItemProps, highlightedIndex) => {
        return (
          <View style={{ paddingLeft: 4, paddingRight: 4 }}>
            <View
              style={{
                overflowY: 'auto',
                willChange: 'transform',
                padding: '5px 0',
                maxHeight: 175,
              }}
            >
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  {...getItemProps({ item })}
                  onClick={() => onSelect(item.id, inputValue)}
                  role="button"
                  data-tag-option-id={item.id}
                  data-tag-highlighted={
                    highlightedIndex === idx ? 'true' : undefined
                  }
                  className={cx(
                    css({
                      backgroundColor:
                        highlightedIndex === idx
                          ? theme.menuAutoCompleteBackgroundHover
                          : 'transparent',
                      color:
                        highlightedIndex === idx
                          ? theme.menuAutoCompleteItemTextHover
                          : theme.menuAutoCompleteText,
                      padding: 4,
                      borderRadius: 4,
                      border: 'none',
                      font: 'inherit',
                    }),
                  )}
                >
                  <NotesTagFormatter notes={item.name} />
                </div>
              ))}
            </View>
          </View>
        );
      }}
      filterSuggestions={(options, inputValue) =>
        filterSuggestions(options, inputValue, cursorPosition)
      }
    />
  );
}

function filterSuggestions(
  suggestions: TagOption[],
  inputValue: string,
  cursorPosition: number,
) {
  if (inputValue.trim() === '' || !cursorPosition) {
    return [];
  }
  const currentWord = getCurrentWord(inputValue, cursorPosition)?.toLowerCase();
  if (!currentWord || !suggestions || currentWord.charAt(0) !== '#') {
    return [];
  }
  const currentWordNoHash = currentWord.slice(1);
  return suggestions
    .filter(o => o.id.toLowerCase().includes(currentWordNoHash))
    .sort(({ id: a }, { id: b }) => {
      const aStarts = a.toLowerCase().startsWith(currentWord);
      const bStarts = b.toLowerCase().startsWith(currentWord);
      if (aStarts && !bStarts) {
        return 1;
      } else if (!aStarts && bStarts) {
        return -1;
      }
      const compare = a.toLowerCase().localeCompare(b.toLowerCase());
      return compare > 0 ? 1 : compare < 0 ? -1 : 0;
    })
    .slice(0, 10);
}

function getCurrentWordRange(
  inputValue: string,
  cursorPosition: number | null,
) {
  if (
    cursorPosition === undefined ||
    cursorPosition === null ||
    inputValue.charAt(cursorPosition - 1).trim() === ''
  ) {
    return [0, 0];
  }
  cursorPosition = cursorPosition - 1;

  let startIdx = cursorPosition;
  const endIdx = cursorPosition + 1;

  while (startIdx > 0 && inputValue.charAt(startIdx - 1).trim() !== '') {
    startIdx--;
  }
  if (startIdx < 0 || endIdx < 0 || startIdx === endIdx) {
    return [0, 0];
  }
  return [startIdx, endIdx];
}

function getCurrentWord(inputValue: string, cursorPosition: number | null) {
  if (cursorPosition === null) return '';
  const [startIdx, endIdx] = getCurrentWordRange(inputValue, cursorPosition);
  return inputValue.slice(startIdx, endIdx);
}
