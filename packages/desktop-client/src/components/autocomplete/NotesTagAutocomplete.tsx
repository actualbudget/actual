import React, { useMemo, type ComponentProps, useRef, useState } from 'react';

import { useLiveQuery } from 'loot-core/client/query-hooks';
import { q } from 'loot-core/shared/query';
import {
  type TransactionEntity,
  type NoteEntity,
} from 'loot-core/types/models';

import { useMergedRefs } from '../../hooks/useMergedRefs';
import { theme } from '../../style';
import { View } from '../common/View';

import { Autocomplete } from './Autocomplete';
import { ItemHeader } from './ItemHeader';

export function NotesTagAutocomplete({
  embedded,
  ...props
}: {
  embedded?: boolean;
} & ComponentProps<typeof Autocomplete<{ id: string; name: string }>>) {
  const notesData = useLiveQuery<NoteEntity[]>(
    () =>
      q('notes')
        .filter({ note: { $like: '#%' } })
        .select('note'),
    [],
  );

  const transactionData = useLiveQuery<TransactionEntity[]>(
    () =>
      q('transactions')
        .filter({ notes: { $like: '#%' } })
        .select('notes'),
    [],
  );

  const allNotes = useMemo(
    () =>
      [
        ...(notesData || []).map(n => n.note),
        ...(transactionData || []).map(t => t.notes),
      ].filter(n => !!n),
    [notesData, transactionData],
  );

  const uniqueTags = useMemo(
    () =>
      [
        ...new Set(
          allNotes
            .flatMap(note => note.split(' '))
            .filter(note => note.startsWith('#') && note.length > 1),
        ),
      ].map(tag => ({ id: tag, name: tag })),
    [allNotes],
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const mergedInputRef = useMergedRefs<HTMLInputElement>(
    inputRef,
    props.inputProps?.inputRef,
  );

  const [value, setValue] = useState(props.value || props.inputProps?.value);

  const onUpdate = (tag: string, inputValue: string) => {
    console.log(`onUpdate inputValue = ${inputValue}`)
    setValue(inputValue);
    props.onUpdate?.(tag, inputValue);
  };

  const onSelect = (tag: string) => {
    let localValue = value;
    if (localValue && tag?.startsWith('#') && !/\s/.test(tag)) {
      // A tag was selected. Append it to the existing notes.
      localValue = insertTextAtCaret(
        localValue,
        tag.substring(1), // Remove hashtag
        inputRef.current?.selectionStart,
      );
      setValue(localValue);
    }
    props.onSelect?.(tag, localValue);
  };

  return (
    <Autocomplete
      openOnFocus={false}
      clearOnBlur={false}
      clearOnSelect={false}
      highlightFirst={true}
      embedded={embedded}
      suggestions={uniqueTags}
      filterSuggestions={(suggestions, notes) => {
        const tag = getTagAtCaret(notes, inputRef.current?.selectionStart);
        if (!tag) {
          return [];
        }

        return tag === '#'
          ? suggestions
          : suggestions.filter(suggestion =>
              suggestion.name.toLowerCase().includes(tag.toLowerCase()),
            );
      }}
      renderItems={(items, getItemProps, highlightedIndex) => (
        <TagList
          items={items}
          getItemProps={getItemProps}
          highlightedIndex={highlightedIndex}
          embedded={embedded}
        />
      )}
      {...props}
      inputProps={{
        ...props.inputProps,
        inputRef: mergedInputRef,
        value: value || '',
      }}
      onUpdate={onUpdate}
      onSelect={onSelect}
    />
  );
}

function TagList<T extends { id: string; name: string }>({
  items,
  getItemProps,
  highlightedIndex,
  embedded,
}: {
  items: T[];
  getItemProps: (arg: { item: T }) => ComponentProps<typeof View>;
  highlightedIndex: number;
  embedded?: boolean;
}) {
  return (
    <View>
      <View
        style={{
          overflow: 'auto',
          padding: '5px 0',
          ...(!embedded && { maxHeight: 175 }),
        }}
      >
        <ItemHeader title="Tags" type="tag" />
        {items.map((item, idx) => {
          return [
            <div
              {...(getItemProps ? getItemProps({ item }) : null)}
              key={item.id}
              style={{
                backgroundColor:
                  highlightedIndex === idx
                    ? theme.menuAutoCompleteBackgroundHover
                    : 'transparent',
                padding: 4,
                paddingLeft: 20,
                borderRadius: embedded ? 4 : 0,
              }}
              data-testid={`${item.name}-tag-item`}
              data-highlighted={highlightedIndex === idx || undefined}
            >
              {item.name}
            </div>,
          ];
        })}
      </View>
    </View>
  );
}

function getTagAtCaret(notes: string, caretPosition: number) {
  let startIndex = caretPosition;
  while (startIndex > 0 && notes[startIndex - 1] !== ' ') startIndex--;

  const whiteSpaceIndex = notes.indexOf(' ', caretPosition);
  const endIndex = whiteSpaceIndex !== -1 ? whiteSpaceIndex : notes.length;

  return notes[startIndex] === '#' ? notes.slice(startIndex, endIndex) : '';
}

function insertTextAtCaret(
  text: string,
  textToInsert: string,
  caretPosition: number,
) {
  // Insert the text at the caret position
  return (
    text.substring(0, caretPosition) +
    textToInsert +
    text.substring(caretPosition)
  );
}
