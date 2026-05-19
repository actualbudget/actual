import { useCallback, useId, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  FocusEventHandler,
  KeyboardEvent,
  KeyboardEventHandler,
} from 'react';
import { ListBox, ListBoxItem, Popover } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { SvgAdd } from '@actual-app/components/icons/v0';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { send } from '@actual-app/core/platform/client/connection';
import { css } from '@emotion/css';

import { useCurrentWordRange } from '#hooks/useCurrentWordRange';
import { useCursorPosition } from '#hooks/useCursorPosition';
import { useTagCSS } from '#hooks/useTagCSS';
import { useFilteredTags } from '#hooks/useTags';

export type TagAutocompleteProps = {
  inputValue: string;
  setInputValue: (v: string) => void;
  inputStyle?: CSSProperties;
  onBlur?: FocusEventHandler;
  onKeyDown?: KeyboardEventHandler;
  onUpdate?: (value: string) => void;
};

export function TagAutocomplete({
  inputValue,

  setInputValue,
  onBlur,
  inputStyle,
  onKeyDown,
  onUpdate,
}: TagAutocompleteProps) {
  const { t } = useTranslation();
  const getTagCSS = useTagCSS({ ellipsis: true });
  const autocompleteId = useId();
  const id = useCallback(
    (itemId: string) => autocompleteId + '|' + itemId,
    [autocompleteId],
  );
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [cursorPosition, setCursorPosition] = useCursorPosition(inputRef);
  const [startIdx, endIdx] = useCurrentWordRange(inputValue, cursorPosition);
  const currentWord = inputValue.slice(startIdx, endIdx);

  const { data: filteredTags, refetch } = useFilteredTags(currentWord, true);
  const filteredItems = useMemo(() => {
    const tagArr =
      filteredTags?.map(tag => ({ ...tag, name: '#' + tag.tag })) ?? [];

    const isValidTag = currentWord.startsWith('#') && currentWord.length > 1;
    const exactMatchExists =
      tagArr.length && '#' + tagArr[0].tag === currentWord;
    if (isValidTag && !exactMatchExists) {
      const currentWordSingleHash = currentWord.replace(/^#+/, '#');
      tagArr.push({
        id: 'create_tag',
        name: `${currentWordSingleHash}`,
        tag: currentWordSingleHash.slice(1),
      });
    }
    return tagArr;
  }, [filteredTags, currentWord]);

  const [isOpen, setIsOpen] = useState(false);
  const showPopup = isOpen && filteredItems.length > 0;

  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const highlightedId =
    showPopup && highlightedIdx >= 0 && highlightedIdx < filteredItems.length
      ? filteredItems[highlightedIdx].id
      : null;
  const scrollItemIntoView = useCallback(
    (idx: number) => {
      const targetId =
        showPopup &&
        idx >= 0 &&
        idx < filteredItems?.length &&
        filteredItems[idx].id;
      if (targetId) {
        const el = document.querySelector(`[data-key="${id(targetId)}"]`);
        el?.scrollIntoView?.({ block: 'nearest' });
      }
    },
    [id, filteredItems, showPopup],
  );

  async function handleSelect(id: string | null) {
    const tagObj = filteredItems.find(tag => tag.id === id);
    if (!tagObj) return;

    if (id === 'create_tag') {
      await send('tags-create', { tag: tagObj.tag });
      void refetch({ cancelRefetch: true });
    }

    const nextChar = inputValue.charAt(endIdx);
    const space = nextChar === ' ' ? '' : ' ';
    const newValue =
      inputValue.slice(0, startIdx) +
      '#' +
      tagObj.tag +
      space +
      inputValue.slice(endIdx);
    setInputValue(newValue);
    setHighlightedIdx(0);
    setIsOpen(false);
    setCursorPosition(startIdx + tagObj.tag.length + 1 + space.length);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showPopup) {
      onKeyDown?.(e);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx(highlightedIdx - 1);
      scrollItemIntoView(highlightedIdx - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx(highlightedIdx + 1);
      scrollItemIntoView(highlightedIdx + 1);
    } else if (e.key === 'Home' && filteredItems.length > 1) {
      e.preventDefault();
      setHighlightedIdx(0);
    } else if (e.key === 'End' && filteredItems.length > 1) {
      setHighlightedIdx(filteredItems.length - 1);
      e.preventDefault();
    } else if (highlightedId && (e.key === 'Enter' || e.key === 'Tab')) {
      e.preventDefault();
      e.stopPropagation();
      void handleSelect(highlightedId);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }

    setHighlightedIdx(idx =>
      Math.max(0, Math.min(idx, filteredItems.length - 1)),
    );
  }

  return (
    <>
      <Input
        ref={inputRef}
        name="notes"
        aria-label={t('Notes')}
        aria-expanded={showPopup}
        aria-controls={id('popover')}
        role="combobox"
        style={inputStyle}
        value={inputValue}
        onChange={e => {
          setIsOpen(true);
          setInputValue(e.currentTarget.value);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        onBlur={onBlur}
        onUpdate={onUpdate}
        autoComplete="off"
      />

      <Popover
        isNonModal
        placement="bottom start"
        className={css(styles.darkScrollbar)}
        style={{
          background: theme.menuAutoCompleteBackground,
          borderRadius: 6,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          width: inputRef.current?.offsetWidth ?? 100,
        }}
        offset={1}
        triggerRef={inputRef}
        isOpen={showPopup}
        onOpenChange={setIsOpen}
      >
        <ListBox
          aria-label={t('Tag List')}
          id={id('popover')}
          items={filteredItems}
          selectionMode="single"
          dependencies={[highlightedId]}
          onPointerDown={e => e.preventDefault()}
          style={{ borderRadius: 4, maxHeight: '150px', overflowY: 'auto' }}
        >
          {(item: (typeof filteredItems)[number]) => (
            <ListBoxItem
              key={item.id}
              id={id(item.id)}
              textValue={item.name}
              style={() => ({
                backgroundColor:
                  highlightedId === item.id
                    ? theme.menuAutoCompleteBackgroundHover
                    : 'transparent',
                alignItems: 'center',
                padding: '4px 4px 1px 4px',
                fontWeight: 500,
                cursor: 'pointer',
                color:
                  highlightedId === item.id
                    ? theme.menuAutoCompleteItemTextHover
                    : theme.menuAutoCompleteItemText,
              })}
              onMouseMove={() => {
                const idx = filteredItems.findIndex(
                  _item => _item.id === item.id,
                );
                if (idx >= 0 && highlightedIdx !== idx) {
                  setHighlightedIdx(idx);
                }
              }}
              onPointerDown={e => e.preventDefault()}
              onClick={() => handleSelect(item.id)}
            >
              {item.id === 'create_tag' ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    color: theme.noticeTextMenu,
                    padding: 4,
                  }}
                >
                  <SvgAdd height={10} width={10} />
                  <span style={{ textWrap: 'nowrap', marginRight: 2 }}>
                    <Trans>Create Tag</Trans>
                  </span>
                  <span className={getTagCSS('')}>{item.name}</span>
                </div>
              ) : (
                <div className={getTagCSS(item.tag)}>{item.name}</div>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </>
  );
}
