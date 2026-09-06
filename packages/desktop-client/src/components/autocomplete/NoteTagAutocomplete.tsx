import type { RefObject } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { SvgAdd } from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { css } from '@emotion/css';

import { useCurrentWordRange } from '#hooks/useCurrentWordRange';
import { useCursorPosition } from '#hooks/useCursorPosition';
import { useInputRefValue } from '#hooks/useInputRefValue';
import { useRefEventListener } from '#hooks/useRefEventListener';
import { useTagCSS } from '#hooks/useTagCSS';
import { useFilteredTags } from '#hooks/useTags';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

type NoteTagAutocompleteProps = {
  inputRef: RefObject<HTMLInputElement | null>;
};

export function NoteTagAutocomplete({ inputRef }: NoteTagAutocompleteProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  // Yes, there is a lot of ref usages in this component. Here's the motivation
  // 1. This component purely modifies HTML Input state, app state is handled elsewhere
  // 2. This component deals with cursor state, which is not easily accessible through regular React code
  // 3. Child transaction notes (transaction.notes) does not update until blur, so we have to use input state
  // 4. Given we are already using inputRef in multiple locations, I elected to simplify the props to just the ref and use HTML/JS events

  const [note, setNote] = useInputRefValue(inputRef);

  const [cursorPosition] = useCursorPosition(inputRef);
  const [startIdx, endIdx] = useCurrentWordRange(note, cursorPosition);
  const currentWord = note.slice(startIdx, endIdx);
  // `##name` is the escape sequence for a literal `#name` (see docs), so only
  // a word with exactly one leading `#` is eligible for tag completion.
  const leadingHashCount = currentWord.match(/^#+/)?.[0].length ?? 0;
  const hasSingleLeadingHash = leadingHashCount === 1;
  const currentWordNoHash = hasSingleLeadingHash ? currentWord.slice(1) : '';
  const { data: filteredTags, refetch } = useFilteredTags(
    hasSingleLeadingHash ? currentWord : '',
    true,
  );
  const showNewTag =
    hasSingleLeadingHash &&
    currentWordNoHash &&
    !filteredTags.some(tag => tag.tag === currentWordNoHash);

  const getTagCSS = useTagCSS({ ellipsis: true });

  function handleSelect(tag: string) {
    if (!inputRef.current) return;
    const newValue =
      note.slice(0, startIdx) + '#' + tag + ' ' + note.slice(endIdx);
    setNote(newValue);
    const newPos = startIdx + tag.length + 2;

    inputRef.current.setSelectionRange(newPos, newPos);
    document.dispatchEvent(new Event('selectionchange'));
  }

  async function handleCreate(tag: string) {
    if (!inputRef.current) return;
    try {
      await send('tags-create', { tag });
      void refetch();
      if (inputRef.current && inputRef.current.value === note) {
        handleSelect(tag);
      }
    } catch (e) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Failed to add tag, check logs'),
          },
        }),
      );
      console.trace(e);
    }
  }

  useRefEventListener(inputRef, 'keydown', e => {
    if (e.key !== 'Tab') return;
    if (filteredTags.length) {
      e.preventDefault();
      e.stopPropagation();
      handleSelect(filteredTags[0].tag);
    } else if (showNewTag) {
      e.preventDefault();
      e.stopPropagation();
      void handleCreate(currentWordNoHash);
    }
  });

  const hideScrollbar = css({
    'scrollbar-width': 'none',
    '-ms-overflow-style': 'none',
    '&::-webkit-scrollbar': {
      display: 'none',
    },
  });

  return (
    <View
      style={{
        width: '100%',
        padding: '4px 8px 4px 8px',
        borderRadius: 30,
        overflowX: 'auto',
        height: filteredTags.length || showNewTag ? 30 : 0,
        transitionProperty: 'height',
        transitionDuration: '100ms',
      }}
      className={hideScrollbar}
    >
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'end',
          flexWrap: 'nowrap',
          gap: 4,
          paddingRight: 8,
        }}
      >
        {filteredTags.map(tag => (
          <div key={tag.id}>
            <button
              type="button"
              style={{
                border: 'none',
                height: 22,
                maxWidth: '50dvw',
              }}
              className={getTagCSS(tag.tag)}
              onMouseDown={e => e.preventDefault()} // stops input from losing focus
              onClick={() => handleSelect(tag.tag)}
            >
              #{tag.tag}
            </button>
          </div>
        ))}
        {showNewTag && (
          <button
            type="button"
            style={{
              padding: '1px 1px 1px 9px',
              borderRadius: 12,
              borderWidth: 0,
              backgroundColor: theme.noticeBackground,
              color: theme.noticeTextDark,
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'nowrap',
              gap: 4,
            }}
            onMouseDown={e => e.preventDefault()} // stops input from losing focus
            onClick={() => handleCreate(currentWordNoHash)}
          >
            <SvgAdd height={8} width={8} />
            <span style={{ whiteSpace: 'nowrap' }}>
              <Trans>Create tag</Trans>
            </span>
            <div
              style={{
                borderWidth: 0,
                height: 20,
                maxWidth: '50dvw',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'inline-block',
              }}
              className={getTagCSS('')}
            >
              #{currentWordNoHash}
            </div>
          </button>
        )}
      </View>
    </View>
  );
}
